/**
 * RouteTemplates are a simple way to re-create routers from pre-built templates.
 * Unlike actual routers, RouteTempltes encode live references to RouteSteps.
 * When building a router from a template, we make copies of referenced RouteSteps,
 * just as we would if building it from scratch.
 */

import {
  model, Schema, Document, Types,
} from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

export interface IRouteTemplate extends Document {
  name: string;

  steps: [{
    id: Types.ObjectId;
    details: string
  }];
}

export const RouteTemplateSchema = new Schema<IRouteTemplate>({
  name: String,
  steps: [{
    id: {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.ROUTE_STEP,
    },
    details: String,
  }],
});

// eslint-disable-next-line max-len
export const RouteTemplateModel = model<IRouteTemplate>(COLLECTIONS.ROUTE_TEMPLATE, RouteTemplateSchema);
