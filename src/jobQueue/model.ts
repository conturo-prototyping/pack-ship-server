/**
 * Job Queues are work queues that deal with an entire job as opposed to processing each lot
 *  individually.
 *
 * This is particularly helpful for stages such as "Planning" or "Shipping", where it is
 *  more useful to process the entire job once all lots are present, rather than lot by lot.
 */

import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IQueue } from '../queues/model';

export const JobQueueSchema = new Schema<IQueue>({
  name: String,
  description: String,
  itemsInQueue: [
    {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.JOB,
    },
  ],
});

export const JobQueueModel = model<IQueue>(
  COLLECTIONS.JOB_QUEUE,
  JobQueueSchema,
);
