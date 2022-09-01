/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { Document, model, Schema } from 'mongoose';
import { ICustomerPart } from '../customerPart/model';
import { ILot } from '../lot/model';

export interface IJob extends Document {
  partId: ICustomerPart['_id'];

  dueDate: string;

  batchQty: number;

  material: string;

  externalPostProcesses: string[];

  lots: ILot['_id'][];

  released: boolean;
}

export const JobSchema = new Schema<IJob>({
  partId: Schema.Types.ObjectId,

  dueDate: String,
  batchQty: Number,
  material: String,
  externalPostProcesses: [String],

  lots: [{
    type: Schema.Types.ObjectId,
    ref: 'lots',
  }],

  released: Boolean,
});

export const JobModel = model<IJob>('job', JobSchema);
