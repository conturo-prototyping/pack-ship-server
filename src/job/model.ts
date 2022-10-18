/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { Document, model, Schema } from 'mongoose';
import { ICustomerPart } from '../customerPart/model';
import { ILot } from '../lot/model';

export interface IJob extends Document {
  // The customer part that this job is for
  partId: ICustomerPart['_id'];

  // when is this job due to the customer?
  dueDate: string;

  // quantity ordered of this part
  batchQty: number;

  // material to use to produce this part
  material: string;

  // array of post processes to apply to job
  externalPostProcesses: string[];

  // array of lots this job will hold
  lots: ILot['_id'][];

  // is this job released (i.e. visible to manufacturing teams)
  released: boolean;

  // is this job on hold (i.e. visible to mfg team but unable to be interacted with)
  onHold: boolean;

  // is this job canceled (i.e. no longer visible)
  canceled: boolean;

  // the standard lot size
  // this is used to auto-generate lots once determined
  stdLotSize: number;
}

export const JobSchema = new Schema<IJob>({
  partId: Schema.Types.ObjectId,

  dueDate: String,
  batchQty: Number,
  material: String,
  externalPostProcesses: [String],

  lots: [
    {
      type: Schema.Types.ObjectId,
      ref: 'lots',
    },
  ],

  released: Boolean,

  onHold: Boolean,

  canceled: Boolean,

  stdLotSize: Number,
});

export const JobModel = model<IJob>('job', JobSchema);
