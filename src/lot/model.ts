/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { Document, model, Schema } from 'mongoose';
import { IJob } from '../job/model';

export interface IRouterStep {
  category: String;
  name: String;
}

export interface ILot extends Document {
  jobId: IJob['_id'];

  quantity: Number;

  router: [{
    step: IRouterStep,
    stepCode: Number,
    stepDetails: String
  }];
}

export const LotSchema = new Schema<ILot>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'jobs',
  },

  quantity: Number,

  router: [{
    step: Object,
    stepCode: Number,
    stepDetails: String,
  }],
});

export const LotModel = model<ILot>('lot', LotSchema);
