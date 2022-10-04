const { Router } = require('express');
const router = Router();
const { LogError, ExpressHandler, HTTPError } = require('../utils');
const IncomingDelivery = require('./model');    //causing an error
const WorkOrder = require('../workOrder/model');

router.get('/', getAll);
router.put('/', createOne);
router.get('/queue', getQueue);
router.post('/receive', setReceived);
router.get('/:deliveryId', getOne);

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

}

/**
 * 
 */
function setReceived(req, res) {

}

/**
 * Get one incomingDelivery by its _id field.
 * Get incomingDelivery, mutate manifest data to only have packing slip items, ...
 * ... auto generate createdBy (if needed) and source field (for now it will be ...
 * ... "VENDOR"), get workOrder infomation, set manifest.item infomation to ...
 * ... workOrder item information (only applicable fields for FE use)
 */
function getOne(req, res) {
  ExpressHandler(
    async () => {
      const { deliveryId } = req.params;
      const incomingDelivery = await IncomingDelivery.findOne({ _id: deliveryId })
        .populate({
          path: 'sourceShipmentId',
          populate: {
            path: 'manifest',
            model: 'packingSlip'
          }
        })
        .lean()
        .exec();

      if ( !incomingDelivery ) return HTTPError('delivery not found');

      const { orderNumber } = incomingDelivery.sourceShipmentId.manifest[0];

      // mutate data as needed
      const newManifest = incomingDelivery.sourceShipmentId.manifest.map( ps => ps.items ).flat();
      incomingDelivery.sourceShipmentId.manifest = newManifest;
      if ( !incomingDelivery.createdBy ) incomingDelivery.createdBy = 'AUTO';
      incomingDelivery.source = 'VENDOR';

      //get item information from workOrder
      const workOrder = await WorkOrder.findOne({ OrderNumber: orderNumber })
        .lean()
        .select('Items')
        .exec();

      if ( !workOrder ) return HTTPError('workOrder not found');
      if ( workOrder.Items.length === 0 ) return HTTPError('no workOrder items found on workOrder');

      // update manifest[].item to item info (can reduce what info is set to reduce the amount of data being sent)
      for ( const mItem of incomingDelivery.sourceShipmentId.manifest ) {
        const itemId = mItem.item.toString();
        const _item = workOrder.Items.find( x => x._id.toString() === itemId );
        if ( !_item ) return HTTPError(`item not found on workOrder ${orderNumber}`);

        // only send some data
        const { PartNumber, PartName, Revision, Quantity, batchNumber } = _item;
        mItem.item = { PartNumber, PartName, Revision, Quantity, batchNumber };
      }

      const data = {incomingDelivery};
      return { data };
    },
    res,
    'fetching incoming delivery'
  );
}