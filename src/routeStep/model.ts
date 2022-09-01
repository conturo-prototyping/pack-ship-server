import { Document, model, Schema } from 'mongoose';

export interface IRouteStep extends Document {
  category: string;
  name: string;
}

export const RouteStepSchema = new Schema<IRouteStep>({
  category: String,
  name: String,
});

export const RouteStepModel = model<IRouteStep>('routeStep', RouteStepSchema, 'routeSteps');
