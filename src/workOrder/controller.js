const { Router } = require("express");
const router = Router();
const WorkOrder = require('./model');
const Customer = require('../customer/model');

router.get('/packingQueue', getPackingQueue);
router.get('/', getAll);

module.exports = router;

/**
 * Get an array of all work orders along with their 'packedQty' values (qty in packing slips)
 */
async function getAll(_req, res) {
  const [err, data] = await getAllWithPackedQties(true);
  if (err) res.status(err.status).send(err.message);
  else res.send(data);
}

/**
 * Get an array of items whose quantity (batch/ordered quantity) is more than
 * the quantity that has already been packed.
 */
async function getPackingQueue(_req, res) {
  const [err, data] = await getAllWithPackedQties(false);
  if (err) res.status(err.status).send(err.message);
  else res.send(data);
}

/**
 * 
 * @param {Boolean} showFulfilled should query show fulfilled qties? 
 */
async function getAllWithPackedQties(showFulfilled) {
  const _customerTagFromOrderNumber = on => {
    const match = on.match(/([A-Z]+)(?:[0-9]+)/);
    return match[1];
  };

  const agg = [
    { $unwind: '$Items' },
    // Fetch the packing slips each work order has appeared in
    { $lookup: {
      from: 'packingSlips',
      localField: 'Items._id',
      foreignField: 'items.item',
      as: 'packingSlips'
    } },

    // unwind
    { $unwind: {
      path: '$packingSlips',
      preserveNullAndEmptyArrays: true
    } },
    { $unwind: {
      path: '$packingSlips.items',
      preserveNullAndEmptyArrays: true
    } },

    // get rid of duplicates
    // AND keep work orders with no packing slips
    { $match: {
      $or: [
        { $expr: { $eq: ['$packingSlips.items.item', '$Items._id'] } },
        { 'packingSlips': { $exists: false } }
      ]
    } },

    // sum quantities
    { $group: {
      _id: '$_id',
      packedQty:        { $sum: '$packingSlips.items.qty' },
      batchQty:         { $first: '$Items.Quantity' },

      batch:            { $first: '$Items.batchNumber' },
      partRev:          { $first: '$Items.Revision' },
      partNumber:       { $first: '$Items.PartNumber' },
      orderNumber:      { $first: '$Items.OrderNumber' },
      partDescription:  { $first: '$Items.PartName' },
    } },
  ];

  if (!showFulfilled) {
    agg.push(
      { $match: {
        $expr: { $gt: ['$batchQty', '$packedQty'] }
      } }
    )
  }

  try {
    const data = await WorkOrder.aggregate(agg);

    const customerTags = new Set();
    data.forEach(x => customerTags.add( _customerTagFromOrderNumber(x.orderNumber) ));
    
    const p_customerData = Array.from(customerTags).map(tag => Customer.findOne({ tag }).lean().exec());
    const customerData = await Promise.all(p_customerData);

    data.forEach(x => {
      x.customer = customerData.find(y => y.tag === _customerTagFromOrderNumber(x.orderNumber))._id
    });

    console.log(data);

    return [null, data];
  }
  catch (e) {
    console.error(e);
    return [{ status: 500, message: e.message }];
  }
}