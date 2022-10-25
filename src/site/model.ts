import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { ISite } from '../global.interfaces';

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
