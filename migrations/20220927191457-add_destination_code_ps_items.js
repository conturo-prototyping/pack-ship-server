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

  // MITCH MIGRATION
  async up(db, _client) {
    const agg = [
      { $match: {
        shipment: { $exists: true },
        isPastVersion: { $ne: true }
      } },
      { $unwind: '$items' },
      { $lookup: {
        from: 'workorders',
        localField: 'orderNumber',
        foreignField: 'OrderNumber',
        as: 'workOrder'
      } },
      { $unwind: '$workOrder' },
      { $unwind: '$workOrder.Items' }, 
      { $match: {
        $expr: { $eq: ['$items.item', '$workOrder.Items._id']}
      } },
      { $addFields: {
        'items.partRouter': { $ifNull: ['$workOrder.Items.partRouter', [] ] },
        somethingelse: 'soemthingelse'
      } },
      { $group: {
        _id: '$_id',
        items: { $push: '$items' },
        packingSlipId: { $first: '$packingSlipId' },
        destination: { $first: '$destination' },
        orderNumber: { $first: '$orderNumber'}
      } }
    ];

    const packingSlips = await db.collection( TARGET_COLLECTION )
      .aggregate(agg)
      .toArray();


    // 2) if item doesn't have a router -> insert default destination code
    for (const p of packingSlips) {
      for (const i of p.items) {
  
        // No part router -> insert default code
        if ( !i?.partRouter?.length ) {
          i.destinationCode = DEFAULT_DESTINATION_CODE;
        }
  
        // part router exists, find appropriate code
        else {
          // if destination = CUSTOMER -> attach i.destinationCode = last router step
          if (p.destination === 'CUSTOMER') {
            i.destinationCode = 'CUSTOMER-' + (i.partRouter.at(-1).stepCode);
          }
          else if (p.destination === 'VENDOR' ) {
  
            const numVendorSteps = i.partRouter.filter(s => s.step.name.toUpperCase() === 'SHIP TO VENDOR')?.length || 0;
  
            // only 1 vendor step, easy fix
            if ( numVendorSteps === 1 ) {
              i.destinationCode = 'VENDOR-' + (i.partRouter.find(s => s.step.name.toUpperCase() === 'SHIP TO VENDOR')).stepCode;
            }
            else if (numVendorSteps === 0) {
              console.debug(`No VENDOR steps found: ${p.packingSlipId} - ${JSON.stringify(i.item._id)}`);
            }
            else {
              console.debug("Multiple VENDOR steps found: " + p.packingSlipId);
            }
          }
        }
  
        // remove partRouter
        delete i.partRouter;
      }
    }
  
    const promises = packingSlips.map(async (p) => {
      await db.collection( TARGET_COLLECTION ).updateOne(
        { _id: p._id },
        { $set: {
          items: p.items
        } }
      );
    });
  
    await Promise.all(promises);
  }, 

  async down(db, _client) {

    const packingSlips = await db
      .collection( TARGET_COLLECTION )
      .find().toArray();

    const promises =[];
    packingSlips.forEach( x => {
      const newItems = x.items.map( i => { 
        delete i.destinationCode;
        return i;
      } )

      promises.push( _updatePS(x._id, newItems) )
    } );

    async function _updatePS(id, items) {
      await db.collection( TARGET_COLLECTION )
        .updateOne(
          { _id: id }, 
          { $set: { items: items } } 
        );
    };

    await Promise.all(promises);
  }
};
