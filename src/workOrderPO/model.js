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
      itemId: ObjectId,
      qtyRequested: Number,
    },
  ],
});

const Model = model("WorkOrderPO ", schema, "WorkOrderPOs");

module.exports = Model;
