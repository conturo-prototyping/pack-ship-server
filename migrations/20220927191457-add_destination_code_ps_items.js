/**
 * To every packingSlip that has been SHIPPED,
 *    AND includes a work order item without a router,
 *    set a default destination code of CUSTOMER-001.
 *
 * This is done b/c after VENDOR packing slip support has been added
 *  we create possibly multiple line items in the packing queue per work order item
 *  according to SHIPPING steps in that item's router.
 * 
 * For example, if the router contains a VENDOR ship step and a CUSTOMER ship step,
 *  that item will show up twice in the queue, once to vendor and another time to customer.
 * 
 * To differentiate multiple "same destination" entries from each other, we add a "destination code"
 *  to each entry which specifies which router step it came from. This is guaranteed to be unique,
 *  because once released router steps codes are permanent.
 */

const { DEFAULT_DESTINATION_CODE } = require("../src/workOrder/controller");

const TARGET_COLLECTION = 'packingSlips';

module.exports = {
  async up(db, _client) {
    // 1) get all shipped packing slips & their work order items
    const packingSlips = await db.collection( TARGET_COLLECTION )
      .aggregate([
        { $match: {
          shipment: { $exists: true },
          isPastVersion: { $ne: true }
        } },
        { $unwind: '$items' },
        { $lookup: {
          from: 'workorders',
          let: { orderNumber: '$orderNumber', itemId: '$items.item' },
          as: 'items.item',
          pipeline: [
            { $match: {
              $expr: { $eq: ['$$orderNumber', '$OrderNumber'] }
            } },
            { $unwind: '$Items' },
            { $match: {
              $expr: { $eq: ['$$itemId', '$Items._id'] },
            } },
            { $project: {
              'Items.partRouter': 1,
              'Items._id': 1,
            } }
          ],
        } },
        { $addFields: {
          'items.item': { $arrayElemAt: ['$items.item.Items', 0] },
        } },
        { $group: {
          _id: '$_id',
          items: { $push: '$items' },
          packingSlipId: { $first: '$packingSlipId' }
        } }
      ])
      .toArray();

    // 2) if item doesn't have a router -> insert default destination code
    for (const p of packingSlips) {
      for (const i of p.items) {

        if ( i.item?.partRouter?.length ) continue;

        i.destinationCode = DEFAULT_DESTINATION_CODE;
        i.item = i.item._id;
      }
    }

    const promises = packingSlips.map(async (p) => {
      await db
        .collection( TARGET_COLLECTION )
        .updateOne(
          { _id: p._id },
          { $set: {
            items: p.items
          } }
        );
    });

    await Promise.all(promises);
  },

  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
