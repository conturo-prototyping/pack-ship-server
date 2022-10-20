import express from 'express';
import { ObjectId } from 'mongodb';
import { ExpressHandler, HTTPError } from '../utils';
import { LotModel } from './model';
import { JobModel } from '../job/model';
import { getRevCode, getRevNumber } from './utils';

const LotRouter = express.Router();

// Middleware to verify lotId exists in the req body
// as well as if the lotId pertains to a valid lot
LotRouter.post(['/scrap'], async (req, res, next) => {
  const { lotId } = req.body;
  if (!lotId) {
    // Make sure lotId is provided
    res.status(400).send('Please provide a lotId');
  } else if (!ObjectId.isValid(lotId)) {
    // Verify if id is valid
    res.status(404).send(`Lot ${lotId} not found`);
  } else {
    // Find the lot and if it doesnt exist, raise an error
    const lot = await LotModel.findById(lotId);

    // Check if the lot exists
    if (!lot) {
      res.status(404).send(`Lot ${lotId} not found`);
    } else {
      res.locals.lot = lot;
      next();
    }
  }
});

LotRouter.post('/scrap', scrapLot);

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

export default LotRouter;
