const { Schema, model } = require("mongoose");

const schema = new Schema({
  title: { type: String, required: true, unique: true },
  tag: { type: String, required: true, unique: true },

  latestOrder: {
    type: Number,
    min: 1000,
    default: 1000,
  },

  isTaxExempt: {
    type: Boolean,
    default: false
  },

  // default account to use if customer requests carrier delivery
  defaultCarrierAccount: String,

  // invoicing payment terms
  defaultPaymentTerms: PaymentTermsSchema,

  // customer contacts
  contacts: [{
    type: ObjectId,
    ref: "oldContact"
  }],

  // keep track of how many shipments & packing slips have been created
  numShipments: {
    type: Number,
    default: 0
  },

  numPackingSlips: {
    type: Number,
    default: 0
  },
});

const Model = model('customer', schema);
module.exports = Model;