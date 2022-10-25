/**
 * router.model.ts
 *
 * Routers define the path a job and its lots (or a specific lot) will take once
 *  a bid has been won.
 */

import { Document, model, Schema } from 'mongoose';
import { IRouteStep } from '../routeStep/model';

export interface IRouterElement {
  step: IRouteStep;
  stepCode: number;
  stepDetails: string;
}

export interface IRouter extends Document {
  path: IRouterElement[];
}

export const RouterSchema = new Schema<IRouter>({
  path: [{
    step: Object,
    stepCode: Number,
    stepDetails: String,
  }],
});

export const RouterModel = model<IRouter>('router', RouterSchema);
