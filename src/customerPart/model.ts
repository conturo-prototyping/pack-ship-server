/**
 * Temporary schema to get rolling in development.
 * This is fairly representative of what the final schema will look like.
 */

import { Document, model, Schema } from 'mongoose';

export interface ICustomerPart extends Document {
  customerId: Schema.Types.ObjectId;
  partNumber: String;
  partDescription: String;
  partRev: String;
};

export const CustomerPartSchema = new Schema<ICustomerPart>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'customers',
  },

  partNumber: String,
  partDescription: String,
  partRev: String,
});

export const CustomerPartModel = model<ICustomerPart>('customerPart', CustomerPartSchema, 'customerParts');
