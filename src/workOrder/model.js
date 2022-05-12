// m_WorkOrder.js
// Model for work orders.
// These documents are permanent and don't get removed.

const mongoose = require("mongoose");
const itemSchema = require('./itemSchema');

/**
 * Work Order schema
 */
const schema = new mongoose.Schema({
  OrderNumber: String,
  DateDue: Date,

  Items: [ itemSchema ],

  certs: {
    material:                   Boolean,
    conformance:                Boolean,
    ITAR_EAR_Restricted:        Boolean,
    DFARS_MaterialRequired:     Boolean,
    firstArticleInspection:     Boolean,
    domesticMaterialRequired:   Boolean,
    EPPCertificationsRequired:  Boolean,
  },

});

module.exports = mongoose.model("workOrder", schema, "workorders");