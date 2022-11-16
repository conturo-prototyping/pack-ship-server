/**
 * Lots essentially define a bunch of "parts" that move around a site together.
 */

import { model, Schema, Document, Types } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

export interface ILot extends Document {
  // Reference to parent Job
  jobId: Types.ObjectId;

  // is this lot on hold? (overrides job.released)
  onHold: boolean;

  // is this lot canceled? (overrides job.released)
  canceled: boolean;

  // quantity to be produced for this lot
  quantity: number;

  // Revision of this lot (in case of entire quantity scrap)
  rev: String;

  specialRouter?: Types.ObjectId;
}

export const LotSchema = new Schema<ILot>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.JOB,
  },

  onHold: Boolean,
  canceled: Boolean,
  quantity: Number,
  rev: String,

  specialRouter: {
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.ROUTER,
  },
});

export const LotModel = model<ILot>(COLLECTIONS.LOT, LotSchema);
