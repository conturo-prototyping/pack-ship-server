import { Document, model, Schema } from 'mongoose';
import { IRouteStep } from '../routeStep/model';

export interface IRouteTemplate extends Document {
  name: string;

  steps: [{
    id: IRouteStep['_id'],
    details: string
  }];
}

export const RouteTemplateSchema = new Schema<IRouteTemplate>({
  name: String,
  steps: [{
    id: {
      type: Schema.Types.ObjectId,
      ref: 'routeSteps',
    },
    details: String,
  }],
});

export const RouteTemplateModel = model<IRouteTemplate>('routeTemplate', RouteTemplateSchema, 'routeTemplates');
