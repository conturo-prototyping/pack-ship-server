// models/employees/User.js
// document Schema for every user that logs in via Google OAuth2

const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const schema = new Schema({
  manifest: [
    {
      type: ObjectId,
      ref: "packingSlip",
    },
  ],

  shipmentImages: [
    {
      type: String,
    },
  ],
});

module.exports = model("tempShipment", schema);
