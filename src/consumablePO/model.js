/* consumablePO
 * Model for Consumable POs that will be generated via the "Purchasing Module"
 *
 * Note: the purchasing module is part of ShopQ-v2 and will not be entirely visible from here.
 */

const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const schema = new Schema({
  PONumber: String,

  type: String, // MATERIAL, TOOLING, GAGES, OTHER

  createdBy: {
    type: ObjectId,
    ref: "users",
  },

  lines: [
    {
      item: String,
      qtyRequested: Number,
    },
  ],
});

const Model = model("ConsumablePO ", schema, "ConsumablePOs");

module.exports = Model;
