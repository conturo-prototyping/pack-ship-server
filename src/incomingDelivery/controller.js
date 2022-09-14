const { Router } = require('express');
const router = Router();

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
  throw new Error('Not implemented.');
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