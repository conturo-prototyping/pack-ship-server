// models/employees/ShopQueue.js
// Model for entries currently in the Shop Queue
// This collection has a single document always.

const mongoose = require("mongoose");

const schema = mongoose.Schema({
  // The items currently in the Shop Queue
  Items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "workOrder"
  }],
},
{
  capped: {
    max: 1,
    autoIndexId: false
  }
});

// TODO: using "ShopQueue" instead of new naming convention "shopQueue"
// b/c desktop app still uses ShopQueue
const model = mongoose.model("shopQueue", schema, "ShopQueue");
module.exports = model;