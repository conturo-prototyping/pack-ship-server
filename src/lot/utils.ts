import express, { NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import { IRouteStep } from '../routeStep/model';
import { ILot } from './model';

export function getRevCode(n: number) {
  if (n < 1) {
    throw new Error('n must be 1 or greater');
  }

  let chars = '';
  let revN = n;
  while (revN !== 0) {
    // 'A' starts at 65th char
    const char = String.fromCharCode(((revN - 1) % 26) + 65);
    chars = char + chars;
    revN = Math.floor((n - 1) / 26);
  }
  return chars;
}

export function getRevNumber(rev: string | null) {
  if (!rev) {
    return 0;
  }

  const revCode = rev.toUpperCase();

  let num = 0;
  for (let i = 0; i < revCode.length; i++) {
    num += (revCode.charCodeAt(i) - 64) * 26 ** (revCode.length - i - 1);
  }

  return num;
}

export async function verifyLotId(
  req: express.Request,
  res: express.Response,
  next: NextFunction,
  model: Model<ILot, {}, {}, {}, any>,
) {
  const { lotId } = req.body;
  if (!lotId) {
    // Make sure lotId is provided
    res.status(400).send('Please provide a lotId');
  } else if (!ObjectId.isValid(lotId)) {
    // Verify if id is valid
    res.status(404).send(`Lot ${lotId} not found`);
  } else {
    // Find the lot and if it doesnt exist, raise an error
    const lot = await model.findById(lotId);

    // Check if the lot exists
    if (!lot) {
      res.status(404).send(`Lot ${lotId} not found`);
    } else {
      res.locals.lot = lot;
      next();
    }
  }
}

export async function verifyStepId(
  req: express.Request,
  res: express.Response,
  next: NextFunction,
  model: Model<IRouteStep, {}, {}, {}, any>,
) {
  const { stepId } = req.body;
  if (!stepId) {
    // Make sure stepId is provided
    res.status(400).send('Please provide a stepId');
  } else if (!ObjectId.isValid(stepId)) {
    // Verify if id is valid
    res.status(404).send(`Router Step ${stepId} not found`);
  } else {
    // Find the step and if it doesnt exist, raise an error
    const step = await model.findById(stepId);

    // Check if the step exists
    if (!step) {
      res.status(404).send(`Router Step ${stepId} not found`);
    } else {
      res.locals.step = step;
      next();
    }
  }
}

export async function verifyStepIdInLot(
  req: express.Request,
  res: express.Response,
  next: NextFunction,
  model: Model<ILot, {}, {}, {}, any>,
) {
  const { stepId, lotId } = req.body;
  if (!stepId) {
    // Make sure stepId is provided
    res.status(400).send('Please provide a stepId');
  } else if (!ObjectId.isValid(stepId)) {
    // Verify if id is valid
    res.status(404).send(`Router Step ${stepId} not found`);
  } else {
    // Find the step with stepId in a specialRouter in a lot with lotId
    const stepOid = new ObjectId(stepId);
    const lotpOid = new ObjectId(lotId);

    const step = await model.find({
      'specialRouter.step._id': stepOid,
      _id: lotpOid,
    });

    // Check if the step exists
    if (step.length === 0) {
      res
        .status(404)
        .send(`Router Step ${stepId} not found in any lot specialRouters`);
    } else {
      res.locals.step = step;
      next();
    }
  }
}
