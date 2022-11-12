/**
 * RouteSteps are the basic building blocks for routers.
 * However, when routers are built, we use copies of the route steps,
 * rather than pointers. This is to preserve the encoded intention at the time
 * of creation, in case of future modifications.
 */

import { model, Schema, Document } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

export interface IRouteStep extends Document {
  category: string;
  name: string;
}

export const RouteStepSchema = new Schema<IRouteStep>({
  category: String,
  name: String,
});

export const RouteStepModel = model<IRouteStep>(COLLECTIONS.ROUTE_STEP, RouteStepSchema);
