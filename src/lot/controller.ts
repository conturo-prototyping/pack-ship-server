import { ObjectId } from 'mongodb';
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

const LotRouter = express.Router();

// Middleware to verify ids exists in the req body
// as well as if the it pertains to a valid object
LotRouter.post(['/scrap'], async (req, res, next) => {
  verifyLotId(req, res, next);
});
LotRouter.patch(['/step'], async (req, res, next) => {
  verifyLotId(req, res, next);
});
LotRouter.patch(['/step'], async (req, res, next) => {
  verifyStepId(req, res, next);
});
LotRouter.patch(['/step'], async (req, res, next) => {
  verifyStepIdInLot(req, res, next);
});
LotRouter.get(['/:lotId/router'], async (req, res, next) => {
  verifyLotId(req, res, next, 'param');
});

LotRouter.post('/scrap', scrapLot);
LotRouter.patch('/step', patchStep);
LotRouter.get('/:lotId/router', getLotRouter);

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
      const rev = getRevCode(revN + 1);
      await LotModel.updateOne({ _id: lot._id }, { $set: { rev } });
      return {};
    },
    res,
    'scrap lot',
  );
}

async function patchStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lot } = res.locals;
      const { stepDetails, stepId } = req.body;
      if (!stepDetails) {
        return HTTPError('stepDetails is empty.', 404);
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
    'patch lot',
  );
}

async function getLotRouter(_req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lot } = res.locals;

      try {
        const { specialRouter } = lot;
        const data = { router: { path: specialRouter } };
        return { data };
      } catch (e) {
        return HTTPError(
          `Error occurred trying to get lot's router for lot ${lot._id}.`,
          500,
        );
      }
    },
    res,
    'get lot router',
  );
}

export default LotRouter;
