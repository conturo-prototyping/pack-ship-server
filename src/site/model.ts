/**
 * site.model.ts
 * Sites are the main hierarchical units of ShopQ.
 * Each site has its own staff, work queues (job & lot), timezone, location, and name.
 *
 * A centralized sales module feeds work to each site.
 */

import { Document, model, Schema } from 'mongoose';
import { IUser, UserModel } from '../user/model';
import { ILotQueue } from '../lotQueue/model';
import { IJobQueue } from '../jobQueue/model';

export interface ISite extends Document {
  // The name of the site; e.g. HQ
  name: string;

  // Shipping address of the site; each line is a new string in the array.
  location: string[];

  // The timezone this site should be synched to.
  timezone: string;

  // Array of staff members employed at the site.
  staff: IUser['_id'][];

  // Array of Job Queues.
  jobQueues: IJobQueue['_id'][];

  // Array of Lot Queues.
  lotQueues: ILotQueue['_id'][];
}

export const SiteSchema = new Schema<ISite>({
  name: String,
  location: [String],
  timezone: String,
  staff: [{
    type: Schema.Types.ObjectId,
    ref: UserModel.collection.name,
  }],
});

export const SiteModel = model<ISite>('site', SiteSchema);
