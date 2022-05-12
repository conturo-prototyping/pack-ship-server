// PackingSlip.js
// Schema for new packing slip which is part of the split shipping modules (2.19^)
// A packing slip consists of:
// - orderNumber    (to aggregate easily)
// - packingSlipId  (unique human-readable identifier)
// - items          (refs to work order items & qty in packing slip)
// - shipment       (ref to shipment-if any-that contains this packing slip--can only be one)

const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const schema = new Schema({
  orderNumber: String,

  customer: {
    type: ObjectId,
    ref: 'customer'
  },

  packingSlipId: {
    type: String,
    required: true,
    unique: true
  },

  items: [{
    // ObjectId of the workorder.Items[] item that is packed here
    // which should give us part details (number, description, batch, qty)
    // NOTE: (jarrilla) this doesn't use ref b/c currently these objects are nested
    item: ObjectId,
    
    // quantity in the packing slip
    qty: Number,
  }],

  dateCreated: {
    type: Date,
    default: Date.now,
  },

  // ref to the shipment ID that contains this packing slip
  // empty until it is assigned to a shipment
  shipment: ObjectId,
});

const Model = model('packingSlip', schema, 'packingSlips');

module.exports = Model;