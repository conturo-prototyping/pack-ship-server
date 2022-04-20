const { Schema, model } = require("mongoose");

const schema = new Schema({
  customerTag: String,

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