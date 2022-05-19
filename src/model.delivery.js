// Legacy schema for delivery documents.
// 

// models/delivery.js
// Schema for delivery contents & metadata of order shipments

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  orderNumber: String,

  packedBy: { type: ObjectId, ref: 'user' },
  packDate: Date,

  delivery: {
    method: String,
    carrier: String,
    speed: String,

    useCustomerAccount: Boolean,
    customerAccountNumber: String,
    
    trackingNumber: String,
    shippingCost: Number,
    notes: String,

    // unique identifier for customer to differentiate partial shipments
    // format <order #>-PS<shipment #> e.g. ABC1004-PS2
    slipId: String,
  },

  destination: String,
  isPartialDelivery: Boolean,

  // comments to customer
  comments: String,

  itemsShipped: [{
    partId: String, // part # or description,
    qtyOrdered: Number,
    qtyShipped: Number,
    rev: String,

    // for internal tracking
    // not shown to customer
    batchNumber: Number,
  }]
});

const Model = mongoose.model('delivery', schema);
module.exports = Model;