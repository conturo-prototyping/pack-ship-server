/**
 * CustomerPart is the basic building block for all quote line-items.
 * Line items will each have a CustomerPart and a PartCostAnalysis
 */

import {
  Document, model, Schema, Types,
} from 'mongoose';

export interface ICustomerPart extends Document {
  customerId: Types.ObjectId;
  partNumber: String;
  partDescription: String;
  partRev: String;
}

export const CustomerPartSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'customers',
  },

  partNumber: String,
  partDescription: String,
  partRev: String,
});

// eslint-disable-next-line max-len
export const CustomerPartModel = model<ICustomerPart>('customerPart', CustomerPartSchema, 'customerParts');
