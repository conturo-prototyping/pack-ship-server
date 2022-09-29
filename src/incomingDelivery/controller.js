const { Router } = require('express');
const router = Router();
const { LogError, ExpressHandler, HTTPError } = require('../utils');
const IncomingDelivery = require('./model');    //causing an error

router.get('/', getAll);
router.put('/', createOne);
router.get('/queue', getQueue);
router.post('/receive', setReceived);
router.get('/getOne', getOne);

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
 * 
 */
function getOne(req, res) {
  ExpressHandler(
    async () => {
      const { _id } = req.body;
      console.log(req.body)
      const incomingDelivery = await IncomingDelivery.findOne({ _id })
        // .populate('sourceShipmentId')    //wasnt sure if how deep we wanted the populate
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

      if ( !incomingDelivery.createdBy ) incomingDelivery.createdBy = 'AUTO';
      incomingDelivery.source = 'VENDOR';

      const data = {incomingDelivery};
      return { data };
    },
    res,
    'fetching incoming delivery'
  );
}