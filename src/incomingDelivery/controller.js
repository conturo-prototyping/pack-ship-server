const { Router } = require('express');
const router = Router();
const { LogError, ExpressHandler, HTTPError } = require('../utils');
const IncomingDelivery = require('./model');    //causing an error
const WorkOrder = require('../workOrder/model');

router.get('/', getAll);
router.put('/', createOne);
router.get('/queue', getQueue);
router.post('/receive', setReceived);

module.exports = {
  router,
  CreateNew
};

/**
 * Manually create a new incoming delivery.
 * Source Shipment Id should only be used if this is getting automatically hit when creating an outgoing shipment.
 * 
 * @param {String} internalPurchaseOrderNumber 
 * @param {ObjectId | String} creatingUserId 
 * @param {String} isDueBackOn
 * @param {(ObjectId | String)?} sourceShipmentId 
 */
async function CreateNew(
  internalPurchaseOrderNumber,
  creatingUserId,
  isDueBackOn,
  sourceShipmentId=undefined
) {
  try {
    const deliveryInfo = {
      internalPurchaseOrderNumber,
      createdBy: creatingUserId,
      isDueBackOn,
    };

    if ( sourceShipmentId ) deliveryInfo.sourceShipmentId = sourceShipmentId;

    const newIncomingDelivery = new IncomingDelivery(deliveryInfo);
    await newIncomingDelivery.save();

    return [ , newIncomingDelivery._id];
  } 
  catch (error) {
    LogError(error);
    return [error];
  }
  
  // throw new Error('Not implemented.');
}

/**
 * Fetch all incoming deliveries ever created.
 */
function getAll(req, res) {

}

/**
 * Create a single incoming delivery.
 * Use this only for manual entries.
 */
function createOne(req, res) {
  ExpressHandler( 
    async () => { 
      const {
        internalPurchaseOrderNumber,
        isDueBackOn,
        sourceShipmentId
      } = req.body;

      const { _id } = req.user;

      const [err, incomingDeliveryId] = await CreateNew(
        internalPurchaseOrderNumber,
        _id,
        isDueBackOn,
        sourceShipmentId
      );

      if ( err ) return HTTPError('error creating new incoming delivery');

      const data = { incomingDeliveryId };
      return { data };
    }, 
    res, 
    'creating an incoming delivery' 
  );

}

/**
 * Get the queue of incoming deliveries that have not yet been received.
 */
function getQueue(req, res) {
  ExpressHandler( 
    async () => { 
      const query = { receivedOn: { $exists: false } };
      const _deliveries = await IncomingDelivery.find(query)
        .lean()
        .populate({
          path: 'sourceShipmentId',
          populate: {
            path: 'manifest',
            model: 'packingSlip',
          }
        })
        .exec();

      const ordersSet = new Set();    //use to track all workOrders that need to be fetched
      const itemsObjs = {};
      const promises = [];

      //map _deliveries into almost final format
      const deliveries = _deliveries.map( (x) => {
        const { _id, label, sourceShipmentId } = x;
        
        const manifestArr = [];
        for ( m of sourceShipmentId.manifest ) {
          manifestArr.push(...m.items)

           //check if ordersSet has order number already, add if not
          if ( ordersSet.has(m.orderNumber) === false ) {
            ordersSet.add(m.orderNumber)
            const _populateItems = async (orderNumber) => {
              const workOrder = await WorkOrder.findOne({ OrderNumber: orderNumber })
                .lean()
                .select('Items')
                .exec();

              for ( const woItem of workOrder.Items ) {
                const { OrderNumber, PartNumber, PartName, Revision, batchNumber } = woItem;
                const _woItem = {
                  orderNumber: OrderNumber,
                  partNumber: PartNumber,
                  partDescription: PartName,
                  partRev: Revision,
                  batch: batchNumber,
                };
                itemsObjs[woItem._id] = _woItem;
              }
            };
            promises.push( _populateItems(m.orderNumber) );
          }
        }

        const _obj = {
          _id,
          label,
          manifest: manifestArr, 
          source: m.destination,
        };

        return _obj;
      })

      await Promise.all(promises)

      //loop through deliveries and create mutated ret array
      const ret = deliveries.map( d => {
        const _manifest = d.manifest.map( ({ item, qty }) => {
          return {
            item: itemsObjs[item],
            qty
          }
        })
        d.manifest = _manifest;
        return d;
      })


      const data = { ret }
      return { data };
    }, 
    res, 
    'fetching incoming deliveries queue' 
  );
}

/**
 * 
 */
function setReceived(req, res) {

}