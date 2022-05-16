const { Router } = require("express");
const router = Router();
const PackingSlip = require("./model.js");
const handler = require("../handler");
var ObjectId = require("mongodb").ObjectId;
const Customer = require('../customer/model');

module.exports = router;

router.get("/", getAllPackingSlips);
router.put("/", createPackingSlip);

router.get("/search", searchPackingSlips);

router.post("/merge", mergePackingSlips);

router.get("/:pid", getPackingSlip);
router.patch("/:pid", editPackingSlip);
router.delete("/:pid", deletePackingSlip);

/**
 * search packing slips
 */
async function searchPackingSlips(req, res) {
  handler(
    async () => {
      let { customer, shipment } = req.query;

      let query = {};
      if ("customer" in req.query) {
        query = { ...query, customer: customer ? ObjectId(customer) : null };
      }
      if ("shipment" in req.query) {
        query = { ...query, shipment: shipment ? ObjectId(shipment) : null };
      }

      const packingSlips = await PackingSlip.find(query).lean().exec();

      return [null, { packingSlips }];
    },
    "fetching packing slips",
    res
  );
}

/**
 * Get a list of all packing slips
 */
async function getAllPackingSlips(_req, res) {
  handler(
    async () => {
      const packingSlips = await PackingSlip.aggregate([
        // { $match: {
        //   shipment: null
        // } },
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

      return [null, { packingSlips }];
    },
    "fetching packing slips",
    res
  );
}

/**
 * Create a new packing slip given an orderNumber &
 */
async function createPackingSlip(req, res) {
  handler(
    async () => {
      const { items, orderNumber, customer } = req.body;
      
      const customerDoc = await Customer.findOne({ _id: customer });
      const { numPackingSlips } = customerDoc;

      const packingSlipId = `${orderNumber}-PS${numPackingSlips + 1}`;

      const packingSlip = new PackingSlip({
        customer,
        orderNumber,
        packingSlipId,
        items,
      });

      await packingSlip.save();

      customerDoc.numPackingSlips = numPackingSlips+1;
      await customerDoc.save();

      return [null, { packingSlip }];
    },
    "creating packing slip",
    res
  );
}

/**
 * Get a specified packing slip by mongo _id
 */
async function getPackingSlip(req, res) {
  handler(
    async () => {
      const { pid } = req.params;

      const packingSlip = await PackingSlip.findById(pid).lean().exec();

      return [null, { packingSlip }];
    },
    "fetching packing slip",
    res
  );
}

/**
 * Edit a specified packing slip given its mongo _id & its new array items[]
 */
async function editPackingSlip(req, res) {
  handler(
    async () => {
      const { pid } = req.params;
      const { items } = req.body;

      await PackingSlip.updateOne(
        { _id: pid },
        {
          $set: {
            items,
          },
        }
      );

      return [null];
    },
    "editing packing slip",
    res
  );
}

/**
 * Delete a specified packing slip given its mongo _id
 */
async function deletePackingSlip(req, res) {
  handler(
    async () => {
      const { pid } = req.params;
      const doc = await PackingSlip.findOne({ _id: pid }).lean();

      if (doc.shipment) return [{ status: 405, message: 'That packing slip has already been shipped.' }];

      await PackingSlip.deleteOne({ _id: pid });
      return [null];
    },
    "deleting packing slip",
    res
  );
}

/**
 * Merge an arbitrary number of packing slips given an array of mongo _ids
 */
async function mergePackingSlips(req, res) {
  handler(
    async () => {
      const { pids, orderNumber } = req.body;

      const numPackingSlips = await PackingSlip.countDocuments({ orderNumber });
      const packingSlips = await PackingSlip.find({ _id: { $in: pids } })
        .lean()
        .exec();

      if (!packingSlips?.length)
        return [{ status: 400, message: "Packing slips not found." }];

      const packingSlipId = `${orderNumber}-PS${
        numPackingSlips - pids.length + 1
      }`;
      const itemsFlat = [].concat(...packingSlips.map((x) => x.items));

      // fix qties to not have a bunch of packing slips with repeat item(Ids) & qties all over the place
      const items = [];
      itemsFlat.forEach(({ item, qty }) => {
        const i = items.findIndex((x) => String(x.item) === String(item));
        if (i >= 0) items[i].qty += qty;
        else items.push({ item, qty });
      });

      const packingSlip = new PackingSlip({
        orderNumber,
        packingSlipId,
        items,
      });

      await PackingSlip.deleteMany({ _id: { $in: pids } });
      await packingSlip.save();

      return [null, { packingSlip }];
    },
    "merging packing slips",
    res
  );
}
