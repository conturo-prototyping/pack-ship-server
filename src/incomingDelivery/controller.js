const { Router } = require('express');
const router = Router();
const { LogError, ExpressHandler, HTTPError } = require('../utils');
const IncomingDelivery = require('./model');    //causing an error
const WorkOrder = require('../workOrder/model');
const Shipment = require('../shipment/model');

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
  if ( !sourceShipmentId ) return [ HTTPError('Shipment ID not sent.', 400) ];

  const [err, ret] = await getSourceShipmentLabel(sourceShipmentId);
  if ( err ) return [ err ];

  const { numberOfDeliveries, shipmentId } = ret;
  let label = shipmentId + '-R';
  if ( numberOfDeliveries > 0 ) label += `${numberOfDeliveries + 1}`;

  const deliveryInfo = {
    internalPurchaseOrderNumber,
    createdBy: creatingUserId,
    isDueBackOn,
    sourceShipmentId,
    label,
  };

  try {
    const incomingDelivery = new IncomingDelivery(deliveryInfo);
    await incomingDelivery.save();

    return [ , { incomingDelivery }];
  } 
  catch (error) {
    LogError(error);
    return [ HTTPError('Unexpected error creating incoming delivery.') ];
  }
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

      const [err, data] = await CreateNew(internalPurchaseOrderNumber, req.user._id, isDueBackOn, sourceShipmentId);
      if ( err ) HTTPError('Error creating new incoming delivery.');

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
      const query = {
        receivedOn: {
          $exists: false
        },
        isPastVersion: { $ne: true }
      };
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


      const data = { 
        incomingDeliveries: ret 
      };
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
  ExpressHandler( 
    async () => { 
      const { _id, receivedQuantities } = req.body;
      const userId = req.user._id
      
      const incomingDelivery = await IncomingDelivery.findOne({ _id });
      if ( incomingDelivery.receivedOn ) return HTTPError('delivery already received');

      incomingDelivery.receivedOn = new Date();
      incomingDelivery.receivedBy = userId;
      incomingDelivery.receivedQuantities = receivedQuantities;

      await incomingDelivery.save();
      const data = { message: 'success' };
      return { data };
    }, 
    res, 
    'setting received data for incoming delivery' 
  );
}

async function getSourceShipmentLabel(id) {
  try {
    const shipment = await Shipment.findOne({ _id: id })
      .lean()
      .select('shipmentId')
      .exec();

    const { shipmentId } = shipment;

    const query = { 
      label: { 
        $regex: shipmentId, 
        $options: 'i' 
      } 
    };

    const numberOfDeliveries = await IncomingDelivery.countDocuments( query );

    const ret = {
      numberOfDeliveries,
      shipmentId
    }
    return [ , ret];
  } 
  catch (error) {
    LogError(error);
    return [ HTTPError('Unexpected error fetching shipment info for labeling.') ];
  }
}