const { Schema, model } = require("mongoose");

const schema = new Schema({
  orderNumber: String,

  batch: String,

  partNumber: String,
  partDescription: String,
  partRev: String,

  quantity: Number,

  customer: {
    type: Schema.Types.ObjectId,
    ref: 'customer'
  }
});

const Model = model('workOrder', schema, 'workOrders');
module.exports = Model;