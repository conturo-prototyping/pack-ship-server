import express from 'express';
import { ObjectId } from 'mongodb';
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
import { RouterModel } from '../router/model';
import STEP_CODE_INCREMENT from '../constants';

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
  verifyStepIdInLot(req, res, next, RouterModel);
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

async function addRouteStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lot, step } = res.locals;
      const { insertAfterIndex } = req.body;
      if (insertAfterIndex === undefined || insertAfterIndex < 0) {
        res.status(405).send('insertInvalidIndex missing or < 0');
        return {};
      }

      // Check if router exists
      const specialRouter = await RouterModel.findOne({
        _id: lot.specialRouter,
      });
      if (!specialRouter) {
        return HTTPError(
          `specialRouter ${lot.specialRouter} does not exist.`,
          404,
        );
      }

      // Check if job exists
      const job = await JobModel.findById(lot.jobId);
      if (!job) {
        return HTTPError(`Job ${lot.jobId} does not exist.`, 404);
      }

      // if job is relased then determine new stepcode
      let newStepCode = 0;
      if (job.released) {
        if (specialRouter.path.length === 0) {
          // insert at the beginning is path is empty
          newStepCode = STEP_CODE_INCREMENT;
        } else if (
          insertAfterIndex >= 0
          && insertAfterIndex < specialRouter.path.length - 1
        ) {
          // We are inserting inbetween
          newStepCode = Math.floor(
            ((specialRouter.path[insertAfterIndex]?.stepCode ?? 0)
              + (specialRouter.path[insertAfterIndex + 1]?.stepCode ?? 0))
              / 2,
          );
        } else if (specialRouter.path.length - 1 === insertAfterIndex) {
          // We are inserting at the end
          newStepCode = (specialRouter.path[insertAfterIndex]?.stepCode ?? 0)
            + STEP_CODE_INCREMENT;
        } else if (specialRouter.path.length <= insertAfterIndex) {
          res
            .status(405)
            .send(
              `insertInvalidIndex invalid for a lot router with path length of ${specialRouter.path.length}`,
            );
          return {};
        }
      }

      specialRouter.path.splice(
        insertAfterIndex !== undefined && insertAfterIndex >= 0
          ? insertAfterIndex + 1
          : 0,
        0,
        {
          step: { ...step },
          stepCode: newStepCode !== 0 ? newStepCode : undefined,
        },
      );
      specialRouter.save();
      res.status(200).send('Success');

      return {};
    },
    res,
    'putting route step',
  );
}

async function patchStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { lot, specialRouter } = res.locals;
      const { stepDetails, stepId } = req.body;
      if (!stepDetails) {
        return HTTPError('stepDetails is empty.', 404);
      }
      try {
        // Update the step via stepid within the path
        const stepOId = new ObjectId(stepId);
        await RouterModel.updateOne(
          { 'path.step._id': stepOId, _id: specialRouter._id },
          { $set: { 'path.$.stepDetails': stepDetails } },
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
