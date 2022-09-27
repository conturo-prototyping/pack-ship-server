const mongoose = require('mongoose');
 
const WorkOrderItemSchema = new mongoose.Schema({
  useSpecialLeadtime: { type: Boolean, default: false },
  dueToVendor: Date,
  dueToCustomer: Date,

  OrderNumber: String,
  PartNumber:   String,
  PartName:     String,
  Revision:     String,
  Quantity:     Number,
  batchNumber:  { type: Number, default: 1 },

  partRouter: [],
  released: Boolean
});
 
 module.exports = WorkOrderItemSchema;