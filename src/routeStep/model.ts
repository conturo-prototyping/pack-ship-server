import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IRouteStep } from '../global.interfaces';

export const RouteStepSchema = new Schema<IRouteStep>({
  category: String,
  name: String,
});

export const RouteStepModel = model<IRouteStep>(COLLECTIONS.ROUTE_STEP, RouteStepSchema);
