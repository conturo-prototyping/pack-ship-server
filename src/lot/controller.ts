import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { LotModel } from './model';
import { JobModel } from '../job/model';
import {
  getRevCode,
  getRevNumber,
  verifyLotId,
  verifyStepId,
  verifyStepIdInLot,
} from './utils';
import { RouteStepModel } from '../routeStep/model';
import { ObjectId } from 'mongodb';

const LotRouter = express.Router();

// Middleware to verify ids exists in the req body
// as well as if the it pertains to a valid object
LotRouter.post(['/scrap'], async (req, res, next) => {
  verifyLotId(req, res, next, LotModel);
});
LotRouter.patch(['/step'], async (req, res, next) => {
  verifyLotId(req, res, next, LotModel);
});
LotRouter.patch(['/step'], async (req, res, next) => {
  verifyStepId(req, res, next, RouteStepModel);
});
LotRouter.patch(['/step'], async (req, res, next) => {
  verifyStepIdInLot(req, res, next, LotModel);
});
LotRouter.put(['/step'], async (req, res, next) => {
  verifyLotId(req, res, next, LotModel);
});
LotRouter.put(['/step'], async (req, res, next) => {
  verifyStepId(req, res, next, RouteStepModel);
});

LotRouter.post('/scrap', scrapLot);
LotRouter.patch('/step', patchStep);
LotRouter.put('/step', addRouteStep);

async function scrapLot(_req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lot } = res.locals;
      const job = await JobModel.findById(lot.jobId);

      // Raise error if jobId doesnt exist
      if (!job) {
        return HTTPError(`Job ${lot.jobId} does not exist.`, 400);
      }

      // Do not edit if job is not-released
      if (job.released) {
        return HTTPError(
          `Job ${job._id} has already been released. Can't scrap lot.`,
          405,
        );
      }

      const currentRev: string = lot.rev;
      const revN = getRevNumber(currentRev);
      lot.rev = getRevCode(revN + 1);
      lot.save();
      return {};
    },
    res,
    'scrap lot',
  );
}

function addRouteStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lotId, stepId, insertAfterIndex } = req.body;

      const lot = await LotModel.findOne({ _id: lotId }).lean();

      if (!lot) return HTTPError('Lot not found (lot ID provided)', 404);

      const routeStep = await RouteStepModel.findOne({ _id: stepId }).lean();

      if (!routeStep)
        return HTTPError('Step not found (step ID provided)', 404);

      lot.specialRouter.splice(
        insertAfterIndex !== undefined && insertAfterIndex >= 0
          ? insertAfterIndex + 1
          : 0,
        0,
        { step: { ...routeStep }, stepCode: 100, stepDetails: '' },
      );

      await LotModel.updateOne(
        { _id: lotId },
        { $set: { specialRouter: lot.specialRouter } },
      );

      return {};
    },
    res,
    'putting route step',
  );
}

async function patchStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lot } = res.locals;
      const { stepDetails, stepId } = req.body;
      if (!stepDetails) {
        return HTTPError(`stepDetails is empty.`, 404);
      }
      try {
        const stepOId = new ObjectId(stepId);
        await LotModel.updateOne(
          { 'specialRouter.step._id': stepOId, _id: lot._id },
          { $set: { 'specialRouter.$.stepDetails': stepDetails } },
        );
      } catch (e) {
        return HTTPError(
          `Error occurred trying to update stepDetails for lotId: ${lot._id} and router step: ${stepId}.`,
          500,
        );
      }
      return {};
    },
    res,
    'putting route step',
  );
}

export default LotRouter;
