// IncomingDelivery.history.js
// Use this model to log all edits/deletions/etc.
// Meant to be pulled together by matching label and sorting by _id

const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const schema = new Schema({
  // Pointer to whoever made edits that created the CURRENT
  // (i.e. the document that triggered creation of this history doc)
  editMadeBy: {
    type: ObjectId,
    ref: "user",
  },

  // AUTOMATICALLY ENTERED
  editMadeOn: { type: Date, default: Date.now },

  // The fields below are exact copies of the same fields in the "model" file.
  label: String,
  createdBy: { type: ObjectId, ref: "user" },
  sourcePoType: String,
  sourcePOId: {
    type: ObjectId,
    refPath: "sourcePOType",
  },
  linesReceived: [
    {
      poLineId: ObjectId,
      qtyReceived: Number,
    },
  ],
  isDueBackOn: String,
  receivedOn: Date,
  receivedBy: { type: ObjectId, ref: "user" },
});

const Model = model("incomingDeliveryHistory", schema);

module.exports = Model;
