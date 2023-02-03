/**
 * The majority of work queues are lot queues. That is, once a job has been broken into lots,
 *  each station processes its stage of the job by lots.
 *
 * Lots move from queue to queue as determined by their router.
 */

import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IQueue } from '../queues/model';

export const LotQueueSchema = new Schema<IQueue>({
  name: String,
  description: String,

  itemsInQueue: [
    {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.LOT,
    },
  ],
});

export const LotQueueModel = model<IQueue>(
  COLLECTIONS.LOT_QUEUE,
  LotQueueSchema,
);
