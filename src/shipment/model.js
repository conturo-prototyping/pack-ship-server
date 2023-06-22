// Shipment.js
// Schema for new packing slip which is part of the split shipping modules (2.19^)
// A packing slip consists of:
// - orderNumber (to aggregate easily)
// - label (unique human-readable identifier)
// - manifest (pointers to all packing slips in this shipment)

const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const schema = new Schema({
  customer: {
    type: ObjectId,
    ref: "oldClient-v2",
  },

  label: {
    type: String,
    required: true,
  },

  manifest: [
    {
      type: ObjectId,
      ref: "packingSlip",
    },
  ],

  deliveryMethod: String, // PICKUP, DROPOFF, CARRIER

  customerHandoffName: String, // For PICKUP or DROPOFF

  // For CARRIER
  carrier: String, // UPS, FEDEX, FREIGHT, OTHER
  deliverySpeed: String,
  customerAccount: String,
  trackingNumber: String,
  cost: Number,

  dateCreated: {
    type: Date,
    default: Date.now,
  },

  createdBy: {
    type: ObjectId,
    ref: "users",
  },

  // This is to track all edits.
  // Latest version is always set to false,
  // Whenever an edit is made, a copy of the document should be made (with this set to true)
  // And the new "copy" (i.e. the edit) will have this set to false
  isPastVersion: {
    type: Boolean,
    default: false,
  },

  specialShippingAddress: String,

  shipmentImages: [
    {
      type: String,
    },
  ],

  routerUploadFilePath: String,
});

const Model = model("shipment", schema, "shipments");

module.exports = Model;
