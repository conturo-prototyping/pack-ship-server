/* workorderPO.model
 * Model for Work Order POs that will be automatically created when
 * VENDOR shipments get created that are DUE BACK
 */

const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const schema = new Schema({
  PONumber: String,

  createdBy: {
    type: ObjectId,
    ref: "users",
  },

  lines: [
    {
      packingSlipId: {
        type: ObjectId,
        ref: "packingSlips",
      },
      itemId: ObjectId, // ref to nested field WorkOrder.Items[]._id
      qtyRequested: Number,
    },
  ],
});

const Model = model("WorkOrderPO ", schema, "WorkOrderPOs");

module.exports = Model;
