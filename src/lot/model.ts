/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { ILot } from '../global.interfaces';

export const LotSchema = new Schema<ILot>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.JOB,
  },

  quantity: Number,

  rev: String,

  specialRouter: {
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.ROUTER,
  },
});

export const LotModel = model<ILot>(COLLECTIONS.LOT, LotSchema);
