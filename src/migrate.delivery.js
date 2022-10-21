const express = require("express");
const router = express.Router();
const Delivery = require("./model.delivery");
const PackingSlip = require("./packingSlip/model");
const Shipment = require("./shipment/model");
const Customer = require("./customer/model");
const WorkOrder = require("./workOrder/model");

module.exports = router;

router.post("/first", async (_req, res) => {
  let deliveries = [];
  try {
    deliveries = await Delivery.find().lean().exec();
  } catch (e) {
    res.status(500).send("Unexpected error fetching deliveries.");
  }

  const customerShipmentCounts = {};

  const _makeNewDocs = async (deliveryDoc) => {
    try {
      const { orderNumber, packedBy, packDate, delivery, itemsShipped } =
        deliveryDoc;

      const customer = await _getCustomerFromOrderNumber(orderNumber);
      const { tag } = customer;
      customerShipmentCounts[tag] = (customerShipmentCounts[tag] || 0) + 1;

      const items = await _getDeliveryItemsAsRefs(orderNumber, itemsShipped);

      const newPackingSlip = new PackingSlip({
        orderNumber,
        customer,
        packingSlipId: delivery.slipId || orderNumber + "-PS1",
        items,

        dateCreated: packDate,
        createdBy: packedBy,
      });

      const newShipment = new Shipment({
        customer,
        label: newPackingSlip.packingSlipId.replace("-PS", "-SH"),
        manifest: [newPackingSlip._id],

        customerHandoffName: "LEGACY DOCUMENT -- UNTRACKED",

        deliveryMethod: delivery.method,
        carrier: delivery.carrier,
        deliverySpeed: delivery.speed,
        customerAccountUsed: delivery.useCustomerAccount
          ? delivery.customerAccountNumber
          : customer.defaultCarrierAccount,
        trackingNumber: delivery.trackingNumber,
        cost: delivery.shippingCost,

        dateCreated: packDate,
        createdBy: packedBy,
      });

      while (1) {
        try {
          await newPackingSlip.save();
          break;
        } catch (ee) {
          // duplicate, +1 and move on
          if (ee.code !== "11000") {
            console.error(ee);
            break;
          }

          console.debug(
            `Fixing duplicate key ${newPackingSlip.packingSlipId}...`
          );

          psId = newPackingSlip.packingSlipId;

          const num = Number.parseInt(psId.indexOf("-PS") + 3);

          newPackingSlip.packingSlipId =
            psId.substring(0, psId.indexOf("-PS")) + (num + 1);
          newShipment.label = newPackingSlip.packingSlipId.replace(
            "-PS",
            "-SH"
          );
        }
      }

      await newShipment.save();
      newPackingSlip.shipment = newShipment._id;
      await newPackingSlip.save();

      const customerUpdates = Object.entries(customerShipmentCounts).map(
        ([tag, count]) => {
          return {
            query: { tag },
            update: {
              $set: {
                numShipments: count,
                numPackingSlips: count,
              },
            },
          };
        }
      );

      await Promise.all(
        customerUpdates.map(({ query, update }) =>
          Customer.updateOne(query, update)
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const promises = deliveries.map((x) => _makeNewDocs(x));
  await Promise.all(promises);

  console.debug(`Done migrating ${promises.length} documents...`);

  res.sendStatus(200);
});

async function _getCustomerFromOrderNumber(orderNumber) {
  const match = orderNumber.match(/([A-Z]+)(?:[0-9]+)/);
  const tag = match[1];

  const customer = await Customer.findOne({ tag }).lean();
  return customer;
}

async function _getDeliveryItemsAsRefs(OrderNumber, itemsShipped = []) {
  const items = await Promise.all(
    itemsShipped.map(async (x) => {
      const wo = await WorkOrder.findOne({
        OrderNumber,
        Items: {
          $elemMatch: {
            $or: [{ PartNumber: x.partId }, { PartName: x.partId }],
          },
        },
      })
        .lean()
        .exec();

      const itemMatch = wo.Items.find(
        (y) => y.PartName === x.partId || y.PartNumber === x.partId
      );

      if (!itemMatch) {
        console.log("No match for " + x.partId);
        console.log("Skipping...");
        return null;
      }

      const item = itemMatch._id;
      const qty = x.qtyShipped;

      return { item, qty };
    })
  );

  return items.filter((x) => !!x);
}
