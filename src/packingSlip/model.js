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
    ref: "oldClient-v2",
  },

  packingSlipId: {
    type: String,
    required: true,
  },

  items: [
    {
      // ObjectId of the workorder.Items[] item that is packed here
      // which should give us part details (number, description, batch, qty)
      // NOTE: (jarrilla) this doesn't use ref b/c currently these objects are nested
      item: ObjectId,

      // quantity in the packing slip
      qty: Number,
    },
  ],

  dateCreated: {
    type: Date,
    default: Date.now,
  },

  createdBy: {
    type: ObjectId,
    ref: "user",
  },

  // ref to the shipment ID that contains this packing slip
  // empty until it is assigned to a shipment
  shipment: ObjectId,

  // This is to track all edits.
  // Latest version is always set to false,
  // Whenever an edit is made, a copy of the document should be made (with this set to true)
  // And the new "copy" (i.e. the edit) will have this set to false
  isPastVersion: {
    type: Boolean,
    default: false,
  },

  destination: {
    type: String,
    default: 'CUSTOMER'
  },

  destinationCode: String,
});

const Model = model("packingSlip", schema, "packingSlips");

module.exports = Model;
