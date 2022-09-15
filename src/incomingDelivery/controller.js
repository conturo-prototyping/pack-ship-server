const { Router } = require('express');
const router = Router();
const { LogError, ExpressHandler, HTTPError } = require('../utils');
const IncomingDelivery = require('./model');    //causing an error

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
}

/**
 * Fetch all incoming deliveries ever created.
 */
function getAll(req, res) {
  ExpressHandler( 
    async () => { 
      const allIncomingDeliveries = await IncomingDelivery.find()
        .lean()
        .select('sourceShipmentId')
        .exec();

      const data = { allIncomingDeliveries };
      return { data };
    }, 
    res, 
    'getting all incoming deliveries' 
  );

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