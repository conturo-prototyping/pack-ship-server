/**
 * Job Queues are work queues that deal with an entire job as opposed to processing each lot
 *  individually.
 *
 * This is particularly helpful for stages such as "Planning" or "Shipping", where it is
 *  more useful to process the entire job once all lots are present, rather than lot by lot.
 */

import {
  model, Schema, Document, Types,
} from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

export interface IJobQueue extends Document {
  // The name of this queue; e.g. "Planning"
  name: string;

  // Description of this queue
  description: string;

  // Jobs currently in this queue
  jobsInQueue: Types.ObjectId[];
}

export const JobQueueSchema = new Schema<IJobQueue>({
  name: String,
  description: String,
  jobsInQueue: [{
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.JOB,
  }],
});

export const JobQueueModel = model<IJobQueue>(COLLECTIONS.JOB_QUEUE, JobQueueSchema);
