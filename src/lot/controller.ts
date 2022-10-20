import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { LotModel } from './model';
import { JobModel } from '../job/model';
import { getRevCode, getRevNumber, verifyLotId, verifyStepId } from './utils';
import { RouteStepModel } from '../routeStep/model';

const LotRouter = express.Router();

// Middleware to verify ids exists in the req body
// as well as if the it pertains to a valid object
LotRouter.post(['/scrap', '/step'], async (req, res, next) => {
  verifyLotId(req, res, next, LotModel);
});
LotRouter.post(['/step'], async (req, res, next) => {
  verifyStepId(req, res, next, RouteStepModel);
});

LotRouter.post('/scrap', scrapLot);
LotRouter.patch('/step', patchStep);

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

async function patchStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lot } = res.locals;
      const { stepDetails } = req.body;
      console.log(lot);
      if (!stepDetails) {
        return HTTPError(`stepDetails is empty.`, 404);
      }

      //TODO
      return {};
    },
    res,
    'scrap lot',
  );
}

export default LotRouter;
