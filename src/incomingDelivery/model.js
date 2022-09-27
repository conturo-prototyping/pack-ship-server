// IncomingDelivery.js
// An incoming delivery will be created manually by a user or automatically
// In the case of automatic creation, the document will be tied to a VENDOR shipment.
// The Internal Purchase Order Number is meant to be the field that connects this delivery to the contents
// 
// In the future, we may consider adding a "contents" or "manifest" field additional to internal PO

const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const schema = new Schema({
  
  // This should be <Source Shipment Label>-R<Optional Number>
  // For example, if source shipment label is "AUR-SH103"
  // This label should be "AUR-SH103-R"
  // ** In case we get 2+ return shipments from the same source, just append R2, 3, 4, etc... skip 1
  label: String,

  // the person that created this delivery
  createdBy: {
    type: ObjectId,
    ref: 'user'
  },

  internalPurchaseOrderNumber: String,

  // If a vendor shipment is due back, it will automatically create an incoming delivery
  // This field connects the two
  // Not set, if manually created
  sourceShipmentId: {
    type: ObjectId,
    ref: 'shipment'
  },

  // Used to track any potential loss
  // best case:   just a copy of packing slip
  // worst case:  copy of packing slip with all qty = 0 
  receivedQuantities: [{
    item: ObjectId,
    qty: Number
  }],

  // mm/dd/yyyy formatted Date of date due
  // This should always exist
  isDueBackOn: String,

  // Who received this delivery and when
  receivedOn: Date,
  receivedBy: {
    type: ObjectId,
    ref: 'user'
  }
});

const Model = model("incomingDelivery", schema, "incomingDeliveries");

module.exports = Model;
