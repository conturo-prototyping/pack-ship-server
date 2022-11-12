/**
 * The majority of work queues are lot queues. That is, once a job has been broken into lots,
 *  each station processes its stage of the job by lots.
 *
 * Lots move from queue to queue as determined by their router.
 */

import {
  model, Schema, Document, Types,
} from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

export interface ILotQueue extends Document {
  // The name of this queue; e.g. "Material"
  name: string;

  // Description of this queue
  description: string;

  // Lots currently in this queue
  lotsInQueue: Types.ObjectId[];
}

export const LotQueueSchema = new Schema<ILotQueue>({
  name: String,
  description: String,

  lotsInQueue: [{
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.LOT,
  }],
});

export const LotQueueModel = model<ILotQueue>(COLLECTIONS.LOT_QUEUE, LotQueueSchema);
