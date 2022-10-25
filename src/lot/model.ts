/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { Document, model, Schema } from 'mongoose';
import { IJob } from '../job/model';
import { IRouterElement } from '../router/model';

export interface ILot extends Document {
  jobId: IJob['_id'];

  quantity: Number;

  rev: String;

  specialRouter: IRouterElement[];
}

export const LotSchema = new Schema<ILot>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'jobs',
  },

  quantity: Number,

  rev: String,

  specialRouter: [
    {
      step: Object, // deep copy of RouterStep
      stepCode: Number,
      stepDetails: String,
    },
  ],
});

export const LotModel = model<ILot>('lot', LotSchema);
