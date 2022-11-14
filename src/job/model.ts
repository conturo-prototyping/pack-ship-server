/**
 * Jobs are each of the line-items that will appear in a order (i.e. a bid that has been won).
 * Being that each Job is comprised of at least one Lot (can be arbitrarily many), the default,
 * router is what each Lot should use in case they do not have an overriding router referenced.
 */

import {
  model, Schema, Document, Types,
} from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

export interface IJob extends Document {
  // The order number as defined by the yet-to-be-developped "Order"
  orderNumber: string;

  // The customer part that this job is for
  partId: Types.ObjectId;

  // when is this job due to the customer?
  dueDate: string;

  // quantity ordered of this part
  batchQty: number;

  // material to use to produce this part
  material: string;

  // array of post processes to apply to job
  externalPostProcesses: string[];

  // is this job released (i.e. are its lots visible in queues)
  released: boolean;

  // is this job on hold? (i.e. can't clock in to any of its lots)
  onHold: boolean;

  // is this job canceled (i.e. no longer visible)
  canceled: boolean;

  // router to use for this job and all of it's lots (if no override)
  router: Types.ObjectId;

  // the standard lot size
  // this is used to auto-generate lots once determined
  stdLotSize: number;

  // array of lots this job will hold
  lots: Types.ObjectId[];
}

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

  released: Boolean,
  onHold: Boolean,
  canceled: Boolean,

  stdLotSize: Number,
});

export const JobModel = model<IJob>(COLLECTIONS.JOB, JobSchema);
