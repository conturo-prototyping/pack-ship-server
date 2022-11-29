/**
 * Routers define the path a job and its lots (or a specific lot) will take once
 *  a bid has been won.
 */

import { model, Schema, Document } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IRouteStep } from '../routeStep/model';

export interface IRouterElement {
  step: IRouteStep;
  stepCode?: number;
  stepDetails?: string;
  isRemoved?: boolean;
}

export interface IRouter extends Document {
  path: IRouterElement[];
}

export const RouterSchema = new Schema<IRouter>({
  path: [
    {
      step: Object,
      stepCode: Number,
      stepDetails: String,
      isRemoved: Boolean,
    },
  ],
});

export const RouterModel = model<IRouter>(COLLECTIONS.ROUTER, RouterSchema);
