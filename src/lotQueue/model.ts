import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { ILotQueue } from '../global.interfaces';

export const LotQueueSchema = new Schema<ILotQueue>({
  name: String,
  description: String,
  lotsInQueue: [{
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.LOT,
  }],
});

export const LotQueueModel = model<ILotQueue>(COLLECTIONS.LOT_QUEUE, LotQueueSchema);
