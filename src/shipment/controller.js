const { Router } = require("express");
const router = Router();
const Shipment = require("./model");
const PackingSlip = require("../packingSlip/model");
const Customer = require("../customer/model");
const handler = require("../handler");
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
  handler(
    async () => {
      let {
        sortBy,
        sortOrder,
        matchOrder,
        matchPart,
        resultsPerPage,
        pageNumber,
      } = req.query;

      if (isNaN(+resultsPerPage) || resultsPerPage <= 0)
        return [
          { status: 400, data: "resultsPerPage must be a positive integer." },
        ];
        
      if (sortBy !== "CUSTOMER" && sortBy !== "DATE") sortBy = "DATE";
      if (sortOrder === "-1" || sortOrder === "1") {
        sortOrder = parseInt(sortOrder);
      }
      else {
        sortOrder = 1;
      }
      if (isNaN(+pageNumber) || pageNumber < 1) pageNumber = 1;

      const allShipments = await Shipment.find()
        .populate("customer")
        .populate({
          path: "manifest",
          populate: "items.item",
        })
        .lean()
        .exec();

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
        }
        else testVal = a.dateCreated.getTime() - b.dateCreated.getTime();
        
        if (testVal * sortOrder < 1) return -1;
        else return 1;
      };

      matchShipments.sort(sortFunc);

      const start = resultsPerPage * (pageNumber - 1);
      const end = resultsPerPage * pageNumber;

      const shipments = matchShipments.slice(start, end);

      return [null, { data: { shipments, totalCount: matchShipments.length } }];
    },
    "searching shipments",
    res
  );
}

/**
 * Get a list of packing slips that are ready to be shipped.
 * This essentially means we just want packing slips that have not yet been assigned to a shipment.
 */
async function getQueue(_req, res) {
  handler(
    async () => {
      const packingSlips = await PackingSlip.aggregate([
        { $match: {
          shipment: null
        } },
        { $unwind: '$items' },
        { $lookup: {
          from: 'workorders',
          // localField: 'items.item',
          // foreignField: 'Items._id',
          let: { workOrderItemId: '$items.item' },
          pipeline: [
            { $unwind: '$Items' },
            { $match: {
              $expr: {
                $eq: [ '$Items._id', '$$workOrderItemId' ]
              }
            } },
            { $group: {
              _id: '$Items._id',
              orderNumber:      { $first: '$Items.OrderNumber' },
              partNumber:       { $first: '$Items.PartNumber' },
              partDescription:  { $first: '$Items.PartName' },
              partRev:          { $first: '$Items.Revision' },
              batch:            { $first: '$Items.batchNumber' },
              quantity:         { $first: '$Items.Quantity'  }, // batchQty
            } },
          ],
          as: 'workOrderItem',
        } },
        { $group: {
          _id: '$_id',
          orderNumber: { $first: { $arrayElemAt: ['$workOrderItem.orderNumber', 0 ] } },
          items: { $push: {
            item: { $arrayElemAt: ['$workOrderItem', 0 ] },
            qty:  '$items.qty'
          } },
          packingSlipId:  { $first: '$packingSlipId' },
          customer:       { $first: '$customer' },
          dateCreated:    { $first: '$dateCreated' },
          shipment:       { $first: '$shipment' }
        } },
        { $lookup: {
          from: 'oldClients-v2',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        } },
      ]);

      // const packingSlips = await PackingSlip.find({ shipment: null })
      //   .populate("customer items.item")
      //   .lean()
      //   .exec();

      return [null, { packingSlips }];
    },
    "fetching shipping queue",
    res
  );
}

/**
 * Get a list of all shipments
 */
async function getAll(_req, res) {
  handler(
    async () => {
      const shipments = await Shipment.find()
        .populate("customer")
        .lean()
        .exec();

      return [null, { shipments }];
    },
    "fetching shipments",
    res
  );
}

/**
 * Create a new shipment given an orderNumber & manifest
 * trackingNumber & cost are optional at this stage
 */
async function createOne(req, res) {
  handler(
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
      });

      await shipment.save();

      // update all packing slips in manifest w/ this shipment's id
      const promises = manifest.map((x) =>
        PackingSlip.updateOne({ _id: x }, { $set: { shipment: shipment._id } })
      );

      customerDoc.numShipments = numShipments + 1;
      promises.push(customerDoc.save());

      await Promise.all(promises);

      return [null, { shipment }];
    },
    "creating shipment",
    res
  );
}

/**
 * Get a specified shipment by mongo _id
 */
async function getOne(req, res) {
  handler(
    async () => {
      const { sid } = req.params;
      const shipment = await Shipment.findById(sid)
        .populate("customer")
        .populate({
          path: "manifest",
          populate: "items.item",
        })
        .lean()
        .exec();

      return [null, { shipment }];
    },
    "fetching shipment",
    res
  );
}

/**
 * Edit a specified shipment given its mongo _id & its new array items[]
 */
async function editOne(req, res) {
  handler(
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

      // Update
      await Shipment.updateOne(
        { _id: sid },
        {
          $set: {
            deliveryMethod,
            cost: cost,
            carrier,
            deliverySpeed,
            customerAccount,
            trackingNumber,
            customerHandoffName,
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

      return [null];
    },
    "editing shipment",
    res
  );
}

/**
 * Delete a specified shipment given its mongo _id
 */
async function deleteOne(req, res) {
  handler(
    async () => {
      const { sid } = req.params;

      // delete shipment
      const p_delete = Shipment.deleteOne({ _id: sid });

      // update packing slips to unassign them from shipments
      const p_updatePackingSlips = PackingSlip.updateMany(
        { shipment: sid },
        { $unset: { shipment: 1 } }
      );

      await Promise.all([p_delete, p_updatePackingSlips]);
      return [null];
    },
    "deleting shipment",
    res
  );
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
