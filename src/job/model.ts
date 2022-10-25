/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IJob } from '../global.interfaces';

export const JobSchema = new Schema<IJob>({
  orderNumber: String,
  partId: Schema.Types.ObjectId,

  dueDate: String,
  batchQty: Number,
  material: String,
  externalPostProcesses: [String],

  lots: [{
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.LOT,
  }],

  router: {
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.ROUTER,
  },

  canceled: Boolean,

  stdLotSize: Number,
});

export const JobModel = model<IJob>(COLLECTIONS.JOB, JobSchema);
