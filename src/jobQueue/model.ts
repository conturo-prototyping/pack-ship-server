import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IJobQueue } from '../global.interfaces';

export const JobQueueSchema = new Schema<IJobQueue>({
  name: String,
  description: String,
  jobsInQueue: [{
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.JOB,
  }],
});

export const JobQueueModel = model<IJobQueue>(COLLECTIONS.JOB_QUEUE, JobQueueSchema);
