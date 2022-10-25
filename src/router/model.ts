import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IRouter } from '../global.interfaces';

export const RouterSchema = new Schema<IRouter>({
  path: [{
    step: Object,
    stepCode: Number,
    stepDetails: String,
  }],
});

export const RouterModel = model<IRouter>(COLLECTIONS.ROUTER, RouterSchema);
