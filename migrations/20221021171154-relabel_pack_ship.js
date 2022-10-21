/**
 * As part of the `addReceiving` branch 1.3.0 of pack-ship-X,
 * we are re-labeling what used to be packingSlip.packingSlipId and shipment.shipmentId
 * which were just human readable strings to identify shipments and packing slips.
 * 
 * They are now being called packingSlip.label & shipment.label
 */

 const { DEFAULT_DESTINATION_CODE } = require("../src/workOrder/controller");

 const PACKING_SLIP_COLLECTION = 'packingSlips';
 const SHIPMENTS_COLLECTION = 'shipments';
 
 module.exports = {
  async up(db) {
    [
      await Promise.all(
        (await db.collection(PACKING_SLIP_COLLECTION).find().toArray())
          .map(async d => upgradePackingSlip(db, d))
      ),
      await Promise.all(
        (await db.collection(SHIPMENTS_COLLECTION).find().toArray())
          .map(async d => upgradeShipment(db, d))
      )
    ]
  },

  async down(db) {
    [
      await Promise.all(
        (await db.collection(PACKING_SLIP_COLLECTION).find().toArray())
          .map(async d => downgradePackingSlip(db, d))
      ),
      await Promise.all(
        (await db.collection(SHIPMENTS_COLLECTION).find().toArray())
          .map(async d => downgradeShipment(db, d))
      )
    ]
  }
};

/**
 * Re-label a packing slip's label back to packingSlipId in case of roll back.
 * We unfortunately will have lost the original order number that packing slip ids
 * used to encode.
 * 
 * @param {*} ps JSON Packing Slip document
 */
async function downgradePackingSlip(db, ps) {
  const { label, _id } = ps;
  
  const labelMatch = label.match(/PACK-([A-Z]+)-([0-9]+)/);
  const customerTag = labelMatch[1];
  const packingSlipNum = labelMatch[2];

  const packingSlipId = `${customerTag}-PS${packingSlipNum}`;
  ps.packingSlipId = packingSlipId;
  
  await db.collection(PACKING_SLIP_COLLECTION).updateOne({ _id }, { $set: { packingSlipId } });
}

/**
 * Re-label a shipment's label back to shipmentId in case of roll back.
 * 
 * @param {*} sh JSON Shipment document
 */
async function downgradeShipment(db, sh) {
  const { label, _id } = sh;
  
  const labelMatch = label.match(/SHIP-([A-Z]+)-([0-9]+)/);
  const customerTag = labelMatch[1];
  const shipmentNum = labelMatch[2];

  const shipmentId = `${customerTag}-SH${shipmentNum}`;
  sh.shipmentId = shipmentId;
  
  await db.collection(SHIPMENTS_COLLECTION).updateOne({ _id }, { $set: { shipmentId } });
}

/**
 * Re-label a packing slip's packingSlipId -> label & shuffle it around using new convention
 * SH-<CUSTOMER_TAG>-<CUSTOMER_PACKING_#>
 * 
 * This is not reversible as we lose the OrderNumber info
 * 
 * @param {*} ps JSON PackingSlip document
 */
async function upgradePackingSlip(db, ps) {
  const { packingSlipId, _id } = ps;
  
  const labelMatch = packingSlipId.match(/([A-Z]+)([0-9]+)?-PS([0-9]+)/);
  const customerTag = labelMatch[1];
  const packingSlipNum = labelMatch[3];

  const label = `PACK-${customerTag}-${packingSlipNum}`;
  ps.label = label;
  
  await db.collection(PACKING_SLIP_COLLECTION).updateOne({ _id }, { $set: { label } });
}

/**
 * Re-label a shipments shipmentId -> label & shuffle it around using new convention
 * SH-<CUSTOMER_TAG>-<CUSTOMER_SHIPMENT_#>
 * @param {*} sh JSON Shipment document
 */
async function upgradeShipment(db, sh) {
  const { shipmentId, _id } = sh;
  
  const labelMatch = shipmentId.match(/([A-Z]+)([0-9]+)?-SH([0-9]+)/);
  const customerTag = labelMatch[1];
  const shipmentNum = labelMatch[3];

  const label = `SHIP-${customerTag}-${shipmentNum}`;
  sh.label = label;
  
  await db.collection(SHIPMENTS_COLLECTION).updateOne({ _id }, { $set: { label } });
}