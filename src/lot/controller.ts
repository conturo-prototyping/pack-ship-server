import { Router } from "express";
import { LotModel } from './model';

export const LotRouter = Router();

LotRouter.get('/', async (_req, res) => {
  const lots = await LotModel.find();
  res.send({ lots });
});