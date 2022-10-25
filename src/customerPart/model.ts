/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { ICustomerPart } from '../global.interfaces';

export const CustomerPartSchema = new Schema<ICustomerPart>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'customers',
  },

  partNumber: String,
  partDescription: String,
  partRev: String,
});

// eslint-disable-next-line max-len
export const CustomerPartModel = model<ICustomerPart>(COLLECTIONS.CUSTOMER_PART, CustomerPartSchema);
