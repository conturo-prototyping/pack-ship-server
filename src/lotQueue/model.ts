/**
 * lotQueue.model.ts
 * The majority of work queues are lot queues. That is, once a job has been broken into lots,
 *  each station processes its stage of the job by lots.
 *
 * Lots move from queue to queue as determined by their router.
 */

import { Document, model, Schema } from 'mongoose';
import { ILot, LotModel } from '../lot/model';

export interface ILotQueue extends Document {
  // The name of this queue; e.g. "Material"
  name: string;

  // Description of this queue
  description: string;

  // Lots currently in this queue
  lotsInQueue: ILot['_id'][];
}

export const LotQueueSchema = new Schema<ILotQueue>({
  name: String,
  description: String,
  lotsInQueue: [{
    type: Schema.Types.ObjectId,
    ref: LotModel.collection.name,
  }],
});

export const LotQueueModel = model<ILotQueue>('lotQueue', LotQueueSchema, 'lotQueues');
