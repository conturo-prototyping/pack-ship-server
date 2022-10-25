import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IRouteTemplate } from '../global.interfaces';

export const RouteTemplateSchema = new Schema<IRouteTemplate>({
  name: String,
  steps: [{
    id: {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.ROUTE_TEMPLATE,
    },
    details: String,
  }],
});

// eslint-disable-next-line max-len
export const RouteTemplateModel = model<IRouteTemplate>(COLLECTIONS.ROUTE_TEMPLATE, RouteTemplateSchema);
