const { Router } = require("express");
const router = Router();
// const WorkOrder = require('./model');
const ShopQueue = require("../shopQ/shopQueue.model");
const Customer = require("../customer/model");

router.get("/packingQueue", getPackingQueue);
router.get("/", getAll);

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
  const _customerTagFromOrderNumber = (orderNum) => {
    const match = orderNum.match(/([A-Z]+)(?:[0-9]+)/);
    return match[1];
  };

  // ShopQ aggregate
  const agg = [
    {
      $lookup: {
        from: "workorders",
        // localField: 'Items',
        // foreignField: '_id',
        as: "activeWorkOrders",
        let: {
          activeWorkOrderIds: "$Items"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$_id", "$$activeWorkOrderIds"],
              },
            },
          },
          { $unwind: "$Items" },

          // only keep:
          // released && !onHold
          { 
            $match: {
              $and: [
                { $expr: { $eq: [ '$Items.released', true ] } },
                { $expr: { $ne: [ '$Items.onHold', true ] } },
              ]
            }
          },

          // now we start making unique entries for every shipping step in the router
          // Essentially, we only keep shipping steps & assign them a code
          // then we tally everything up
          {
            $unwind: {
              path: '$Items.partRouter',
              preserveNullAndEmptyArrays: true
            }
          },

          // Filter out non-shipping steps
          {
            $match: {
              $or: [
                // Keep legacy items that do not have a partRouter[]
                // We will insert a SHIP TO CUSTOMER step manually
                { 'Items.partRouter': { $exists: false } },

                {
                  $and: [
                    { $expr: {
                      $eq: [ { $toUpper: '$Items.partRouter.step.category' }, 'SHIPPING' ]
                    } },

                    // If the shipping step was NULLED out, discard it
                    { $expr: {
                      $ne: [
                        { $substr: [
                          '$Items.partRouter.step.name', 0, 6
                        ] },
                        '-NULL-'
                      ]
                    } }
                  ]
                },
              ]
            } 
          },

          // add in destination and destinationCode fields
          {
            $addFields: {

              // destination is either CUSTOMER or VENDOR
              // default is CUSTOMER (if no router exists i.e. legacy orders)
              destination: {
                $cond: [
                  { 
                    $or: [
                      { $eq: [ { $toUpper: '$Items.partRouter.step.name' }, 'SHIP TO CUSTOMER'] },
                      { $not: ['$Items.partRouter'] }
                    ] 
                  },
                  'CUSTOMER',
                  'VENDOR'
                ]
              }, 

              // destination code is <DESTINATION>-<STEP NUMBER>
              // default is CUSTOMER-001 (i.e. for legacy orders)
              destinationCode : {
                $cond: [
                  {
                    $or: [
                      { $eq: [ { $toUpper: '$Items.partRouter.step.name' }, 'SHIP TO CUSTOMER'] },
                      { $not: ['$Items.partRouter'] }
                    ]
                  },
                  { $concat: ['CUSTOMER-', { $toString: { $ifNull: ['$Items.partRouter.stepCode', '001'] } } ] },
                  { $concat: ['VENDOR-', { $toString: '$Items.partRouter.stepCode' } ] }
                ]
              }
            }
          },

          // match entries to their packing slips by itemId & destinationCode
          {
            $lookup: {
              from: "packingSlips",
              as: "packingSlips",
              let: { workOrderItemId: '$Items._id', destinationCode: '$destinationCode' },
              pipeline: [
                { $match: {
                  $and: [
                    { $expr: { $ne: ['$isPastVersion', true] } },                  // ignore edit histories
                    { $expr: { $in: ['$$workOrderItemId', '$items.item'] } },      // pull all packing slips that contain this item (to count packed qties)
                  ]
                } },
                { $unwind: '$items' },
                { $match: {
                  $or: [
                    {
                      $and: [
                        { 'items.destinationCode': { $exists: false } },
                        { $expr: { $eq: ['$$destinationCode', 'CUSTOMER-001'] } }
                      ],
                    },
                    { $expr: { $eq: ['$items.destinationCode', '$$destinationCode'] } }
                  ]
                } },
                { $group: {
                  _id: '$_id',
                  orderNumber:    { $first: '$orderNumber' },
                  customer:       { $first: '$customer' },
                  packingSlipId:  { $first: '$packingSlipId' },
                  items:          { $push: '$items' },
                  dateCreated:    { $first: '$dateCreated' },
                  createdBy:      { $first: '$createdBy' },
                  shipment:       { $first: '$shipment' },
                  isPastVersion:  { $first: '$isPastVersion' },
                  destination:    { $first: '$destination' }
                } }
              ]
            },
          },

          // unwind packing slips & items[] so we can ditch duplicates
          {
            $unwind: {
              path: "$packingSlips",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$packingSlips.items",
              preserveNullAndEmptyArrays: true,
            },
          },
          

          // get rid of duplicates
          // AND keep work orders with no packing slips
          {
            $match: {
              $or: [
                { $expr: { $eq: ["$packingSlips.items.item", "$Items._id"] } },
                { packingSlips: { $exists: false } },
              ],
            },
          },

          // sum quantities
          {
            $group: {
              _id: {
                itemId: "$Items._id",
                destinationCode: '$destinationCode'
              },

              // sum of packed quantities
              packedQty: { $sum: '$packingSlips.items.qty' },
              batchQty: { $first: "$Items.Quantity" },

              batch: { $first: "$Items.batchNumber" },
              partRev: { $first: "$Items.Revision" },
              partNumber: { $first: "$Items.PartNumber" },
              orderNumber: { $first: "$Items.OrderNumber" },
              partDescription: { $first: "$Items.PartName" },
              released: { $first: '$Items.released' },
              destination: { $first: '$destination'},
            },
          },
        ]
      }
    },
  ];

  if (!showFulfilled) {
    agg[0].$lookup.pipeline.push({
      $match: {
        $expr: { $gte: ["$batchQty", "$packedQty"] },
      },
    });
  }

  try {
    const d = await ShopQueue.aggregate(agg);
    const data = d?.[0]?.activeWorkOrders;

    console.debug(data.filter(x => x.orderNumber === 'WAABI1006'));

    const customerTags = new Set();
    data.forEach((x) => {
      if (!x?.orderNumber) {
        return;
      }
      customerTags.add(_customerTagFromOrderNumber(x.orderNumber));
    });

    const p_customerData = Array.from(customerTags).map((tag) =>
      Customer.findOne({ tag }).lean().exec()
    );
    const customerData = (await Promise.all(p_customerData)).filter((x) => !!x);

    data.forEach((x) => {
      const tagToMatch = _customerTagFromOrderNumber(x.orderNumber);
      x.customer = customerData.find((y) => y.tag === tagToMatch)?._id;
      
      // fix Id
      x.destinationCode = x._id.destinationCode;
      x._id = x._id.itemId;
    });

    return [null, data];
  } catch (e) {
    console.error(e);
    return [{ status: 500, message: e.message }];
  }
}
