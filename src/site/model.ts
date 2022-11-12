/**
 * Sites are the main hierarchical units of ShopQ.
 * Each site has its own staff, work queues (job & lot), timezone, location, and name.
 *
 * A centralized sales module feeds work to each site.
 */

import {
  model, Schema, Document, Types,
} from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

export interface ISite extends Document {
  // The name of the site; e.g. HQ
  name: string;

  // Shipping address of the site; each line is a new string in the array.
  location: string[];

  // The timezone this site should be synched to.
  timezone: string;

  // Array of staff members employed at the site.
  staff: Types.ObjectId;

  // Array of Job Queues.
  jobQueues: Types.ObjectId[];

  // Array of Lot Queues.
  lotQueues: Types.ObjectId[];
}

export const SiteSchema = new Schema<ISite>({
  name: String,
  location: [String],
  timezone: String,
  staff: [{
    type: Schema.Types.ObjectId,
    ref: COLLECTIONS.USER,
  }],
});

export const SiteModel = model<ISite>(COLLECTIONS.SITE, SiteSchema);
