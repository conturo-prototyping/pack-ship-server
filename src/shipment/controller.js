const { Router } = require("express");
const router = Router();
const Shipment = require("./model");
const PackingSlip = require("../packingSlip/model");
const Customer = require("../customer/model");
const { GetPopulatedPackingSlips } = require("../packingSlip/controller");
const { ExpressHandler, HTTPError, LogError } = require("../utils");
var ObjectId = require("mongodb").ObjectId;

module.exports = router;

router.get("/", getAll);
router.put("/", createOne);

router.get("/search", searchShipments);

router.get("/queue", getQueue);

router.get("/:sid", getOne);
router.patch("/:sid", editOne);
router.delete("/:sid", deleteOne);

/**
 * Compute a search of shipment documents that match either a given order or a given part.
 * Further, results should be paginated according to the parameters
 * - resultsPerPage
 * - pageNumber
 *
 * TODO: this query should really be using a more sophisticated aggregation pipeline,
 *    but for testing, we're just pulling all docs and having the server truncate.
 */
async function searchShipments(req, res) {
  ExpressHandler(
    async () => {
      let {
        sortBy,
        sortOrder,
        matchOrder,
        matchPart,
        resultsPerPage,
        pageNumber,
      } = req.query;

      if (isNaN(+resultsPerPage) || resultsPerPage <= 0) {
        return HTTPError("resultsPerPage must be a positive integer.", 400);
      }

      if (sortBy !== "CUSTOMER" && sortBy !== "DATE") sortBy = "DATE";
      if (sortOrder === "-1" || sortOrder === "1") {
        sortOrder = parseInt(sortOrder);
      } else {
        sortOrder = 1;
      }
      if (isNaN(+pageNumber) || pageNumber < 1) pageNumber = 1;

      const [_, { allShipments }] = await getPopulatedShipmentData();

      let matchShipments;
      if (!matchOrder && !matchPart) {
        matchShipments = allShipments;
      } else {
        matchShipments = allShipments.filter((x) =>
          x.manifest.some(
            (y) =>
              (matchOrder && new RegExp(matchOrder).test(y.orderNumber)) ||
              (matchPart &&
                y.items.some(
                  (z) =>
                    new RegExp(matchPart).test(z.item.partNumber) ||
                    new RegExp(matchPart).test(z.item.partDescription)
                ))
          )
        );
      }

      const sortFunc = (a, b) => {
        let testVal;
        if (sortBy === "CUSTOMER") {
          testVal = a.customer.tag.localeCompare(b.customer.tag);
        } else testVal = a.dateCreated.getTime() - b.dateCreated.getTime();

        if (testVal * sortOrder < 1) return -1;
        else return 1;
      };

      matchShipments.sort(sortFunc);

      const start = resultsPerPage * (pageNumber - 1);
      const end = resultsPerPage * pageNumber;

      const shipments = matchShipments.slice(start, end);

      return {
        data: {
          shipments,
          totalCount: matchShipments.length,
        },
      };
    },
    res,
    "searching shipments"
  );
}

/**
 * Get a list of packing slips that are ready to be shipped.
 * This essentially means we just want packing slips that have not yet been assigned to a shipment.
 */
async function getQueue(_req, res) {
  ExpressHandler(
    async () => {
      const [e, { packingSlips }] = await GetPopulatedPackingSlips(true);
      if (e) return HTTPError("Error fetching shipping queue.");

      return {
        data: {
          packingSlips,
        },
      };
    },
    res,
    "fetching shipping queue"
  );
}

/**
 * Get a list of all shipments
 */
async function getAll(_req, res) {
  ExpressHandler(
    async () => {
      const shipments = await Shipment.find()
        .populate("customer")
        .lean()
        .exec();

      return {
        data: {
          shipments,
        },
      };
    },
    res,
    "fetching shipments"
  );
}

/**
 * Create a new shipment given an orderNumber & manifest
 * trackingNumber & cost are optional at this stage
 */
async function createOne(req, res) {
  ExpressHandler(
    async () => {
      const {
        manifest,
        customer,
        trackingNumber,
        cost,
        deliveryMethod,
        carrier,
        deliverySpeed,
        customerAccount,
        customerHandoffName,
      } = req.body;

      const customerDoc = await Customer.findOne({ _id: customer });
      const { tag, numShipments } = customerDoc;

      const shipmentId = `${tag}-SH${numShipments + 1}`;

      const shipment = new Shipment({
        customer,
        shipmentId,
        manifest,

        deliveryMethod,
        customerHandoffName,
        carrier,
        deliverySpeed,
        customerAccount,
        trackingNumber,
        cost,

        createdBy: req.user._id,
      });

      await shipment.save();

      // update all packing slips in manifest w/ this shipment's id
      const promises = manifest.map((x) =>
        PackingSlip.updateOne({ _id: x }, { $set: { shipment: shipment._id } })
      );

      customerDoc.numShipments = numShipments + 1;
      promises.push(customerDoc.save());

      await Promise.all(promises);

      return {
        data: {
          shipment,
        },
      };
    },
    res,
    "creating shipment"
  );
}

/**
 * Get a specified shipment by mongo _id
 */
async function getOne(req, res) {
  ExpressHandler(
    async () => {
      const { sid } = req.params;
      const [_, { allShipments }] = await getPopulatedShipmentData(sid);
      const shipment = allShipments[0];

      return {
        data: {
          shipment,
        },
      };
    },
    res,
    "fetching shipment"
  );
}

/**
 * Edit a specified shipment given its mongo _id & its new array items[]
 */
async function editOne(req, res) {
  ExpressHandler(
    async () => {
      const { sid } = req.params;
      let {
        deliveryMethod,
        cost,
        carrier,
        deliverySpeed,
        customerAccount,
        trackingNumber,
        customerHandoffName,
        deletedPackingSlips,
        newPackingSlips,
      } = req.body;

      const p_deleted =
        deletedPackingSlips?.map((x) => unassignPackingSlipFromShipment(x)) ??
        [];

      const p_added =
        newPackingSlips?.map((x) => assignPackingSlipToShipment(x, sid)) ?? [];

      await updateShipmentTrackingHistory(sid);

      let updateDict = {};

      if (deliveryMethod) updateDict = { ...updateDict, deliveryMethod };
      if (cost) updateDict = { ...updateDict, cost };
      if (carrier) updateDict = { ...updateDict, carrier };
      if (deliverySpeed) updateDict = { ...updateDict, deliverySpeed };
      if (customerAccount) updateDict = { ...updateDict, customerAccount };
      if (trackingNumber) updateDict = { ...updateDict, trackingNumber };
      if (customerHandoffName)
        updateDict = { ...updateDict, customerHandoffName };

      // Update
      await Shipment.updateOne(
        { _id: sid },
        {
          $set: {
            ...updateDict,
          },
          $pull: {
            manifest: {
              $in: deletedPackingSlips?.map((e) => ObjectId(e)) ?? [],
            },
          },
        }
      );

      // then update newPackingSlips otherwise a conflict will occur
      await Shipment.updateOne(
        { _id: sid },
        {
          $push: {
            manifest: { $each: newPackingSlips?.map((e) => ObjectId(e)) ?? [] },
          },
        }
      );

      const promises = p_deleted.concat(p_added);
      await Promise.all(promises);
    },
    res,
    "editing shipment"
  );
}

/**
 * Delete a specified shipment given its mongo _id
 */
async function deleteOne(req, res) {
  ExpressHandler(
    async () => {
      const { sid } = req.params;

      await updateShipmentTrackingHistory(sid);

      // delete shipment
      const p_delete = Shipment.deleteOne({ _id: sid });

      // update packing slips to unassign them from shipments
      const p_updatePackingSlips = PackingSlip.updateMany(
        { shipment: sid },
        { $unset: { shipment: 1 } }
      );

      await Promise.all([p_delete, p_updatePackingSlips]);
    },
    res,
    "deleting shipment"
  );
}

async function updateShipmentTrackingHistory(sid) {
  let oldShipment = {
    ...(await Shipment.findById(sid).lean().exec()),
    isPastVersion: true,
  };

  delete oldShipment["_id"];
  const editedShipment = new Shipment({
    ...oldShipment,
  });

  await editedShipment.save();
}

/**
 *
 * @param {any[]} packingSlipId Id of packing slip to assign
 * @param {string} shipmentId _id of Shipment to assign to packing slip
 */
async function assignPackingSlipToShipment(packingSlipId, shipmentId) {
  await PackingSlip.updateOne(
    { _id: packingSlipId },
    { $set: { shipment: shipmentId } }
  );
}

async function unassignPackingSlipFromShipment(packingSlipId) {
  await PackingSlip.updateOne(
    { _id: packingSlipId },
    { $unset: { shipment: 1 } }
  );
}

/**
 * Get shipment documents with manifest.items.item populated
 *
 * @param {(String | mongoose.Schema.Types.ObjectId)?} shipmentId
 */
async function getPopulatedShipmentData(shipmentId = undefined) {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "packingSlips",
          as: "manifest",
          let: { manifest: "$manifest" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$manifest"] },
              },
            },
            { $unwind: "$items" },
            {
              $lookup: {
                from: "workorders",
                let: {
                  // ---- FORMAT OF ITEMS ARRAY
                  // items: [{
                  //   _id,   // the front-end uses this to distinguish items (auto-generated)
                  //   item,  // ID of the item packed
                  //   qty    // packed qty of item
                  // }]
                  // --------------
                  arrayItemIds: "$items._id",
                  packedItemIds: "$items.item",
                  packedItemQtys: "$items.qty",
                  orderNumber: "$orderNumber",
                  packingSlipOID: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$OrderNumber", "$$orderNumber"] },
                    },
                  },
                  { $unwind: "$Items" },
                  {
                    $match: {
                      $expr: { $eq: ["$Items._id", "$$packedItemIds"] },
                    },
                  },
                  {
                    $group: {
                      _id: "$Items._id",
                      item: {
                        $first: {
                          _id: "$Items._id",
                          orderNumber: "$Items.OrderNumber",
                          partNumber: "$Items.PartNumber",
                          partDescription: "$Items.PartName",
                          partRev: "$Items.Revision",
                          batch: "$Items.batchNumber",
                          quantity: "$Items.Quantity", // batchQty
                        },
                      },
                      packingSlipId: { $first: "$$packingSlipOID" },
                      packedQty: { $first: "$$packedItemQtys" },
                      rowId: { $first: "$$arrayItemIds" },
                      isPastVersion: {
                        $first: {
                          isPastVersion: "$isPastVersion",
                        },
                      },
                    },
                  },
                  {
                    $addFields: {
                      _id: "$rowId",
                    },
                  },
                ],
                as: "items",
              },
            },
            {
              $group: {
                _id: { $arrayElemAt: ["$items.packingSlipId", 0] },
                items: {
                  $push: {
                    _id: { $arrayElemAt: ["$items.rowId", 0] },
                    item: { $arrayElemAt: ["$items.item", 0] },
                    qty: { $arrayElemAt: ["$items.packedQty", 0] },
                  },
                },
                customer: { $first: "$customer" },
                orderNumber: { $first: "$orderNumber" },
                packingSlipId: { $first: "$packingSlipId" },
                createdBy: { $first: "$createdBy" },
                dateCreated: { $first: "$dateCreated" },
                shipment: { $first: "$shipment" },
              },
            },
          ],
          as: "manifest",
        },
      },
      {
        $lookup: {
          from: "oldClients-v2",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $addFields: {
          customer: { $arrayElemAt: ["$customer", 0] },
        },
      },
    ];

    if (shipmentId) {
      pipeline.splice(0, 0, {
        $match: { _id: ObjectId(shipmentId) },
      });
    }

    pipeline.push({
      $match: {
        isPastVersion: { $ne: true },
      },
    });

    const allShipments = await Shipment.aggregate(pipeline);

    return [null, { allShipments }];
  } catch (e) {
    LogError(e);
    return [e];
  }
}
