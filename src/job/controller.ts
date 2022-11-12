import express from 'express';
import { ObjectId } from 'mongodb';
import { JobModel } from './model';
import { ExpressHandler, HTTPError } from '../utils';
import { CustomerPartModel } from '../customerPart/model';

const JobRouter = express.Router();
JobRouter.get('/', getJobs);
JobRouter.get('/planningReleased', getPlanningReleased);

// Middleware to verify jobId exists in the req body
// as well as if the jobId pertains to a valid job
JobRouter.post(
  ['/hold', '/release', '/cancel', '/lotSize'],
  async (req, res, next) => {
    const { jobId } = req.body;

    if (!jobId) {
      // Make sure jobId is provided
      res.status(400).send('Please provide a jobId');
    } else if (!ObjectId.isValid(jobId)) {
      // Verify if id is valid
      res.status(404).send(`Job ${jobId} not found`);
    } else {
      // Find the job and if it doesnt exist, raise an error
      const job = await JobModel.findById(jobId);

      // Check if the job exists
      if (!job) {
        res.status(404).send(`Job ${jobId} not found`);
      } else {
        res.locals.job = job;
        next();
      }
    }
  },
);

JobRouter.post('/hold', holdJob);
JobRouter.post('/release', releaseJob);
JobRouter.post('/cancel', cancelJob);
JobRouter.post('/lotSize', setStdLotSize);

async function getJobs(_req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const jobs = await JobModel.find().lean();

      const data = { jobs };
      return { data };
    },
    res,
    'getting all jobs',
  );
}

async function getPlanningReleased(
  req: express.Request,
  res: express.Response,
) {
  ExpressHandler(
    async () => {
      const { regexFilter } = req.query; // This has already been decoded by express

      // Find the jobs
      const jobs = await JobModel.aggregate([
        {
          $lookup: {
            from: CustomerPartModel.collection.collectionName,
            localField: 'partId',
            foreignField: '_id',
            as: 'customerParts',
          },
        },
        {
          $match: {
            $and: [
              { released: true },
              { canceled: false },
              {
                $or: [
                  {
                    'customerParts.partNumber': {
                      $regex: regexFilter || '',
                      $options: 'i',
                    },
                  },
                  {
                    'customerParts.partDescription': {
                      $regex: regexFilter || '',
                      $options: 'i',
                    },
                  },
                  {
                    orderNumber: {
                      $regex: regexFilter || '',
                      $options: 'i',
                    },
                  },
                ],
              },
            ],
          },
        },
      ]);
      const data = { jobs };
      return { data };
    },
    res,
    'getting all planning released jobs',
  );
}

async function holdJob(_req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { job } = res.locals;

      // If the job is not released, then do not hold
      if (!job.released) {
        return HTTPError(`Job ${job._id} has not been released yet`, 405);
      }

      // Do not update a job that is already on hold
      if (job.onHold) {
        return HTTPError(`Job ${job._id} is already on hold`, 405);
      }

      // update job onHold status
      job.onHold = true;
      job.save();

      return {};
    },
    res,
    'holding job',
  );
}

async function releaseJob(_req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { job } = res.locals;

      // update job onHold status
      job.onHold = false;
      job.released = true;
      job.save();
      return {};
    },
    res,
    'release job',
  );
}

async function cancelJob(_req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { job } = res.locals;
      // If the job is already cancelled raise an error
      if (job.canceled) {
        return HTTPError(`Job ${job._id} has already been canceled`, 405);
      }

      job.canceled = true;
      job.save();
      return {};
    },
    res,
    'cancel job',
  );
}

async function setStdLotSize(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { jobId, lotSize } = req.body;

      // If there is no Job ID, we can't do anything
      if (lotSize === undefined) {
        return HTTPError('Please provide a lotSize', 400);
      } if (lotSize <= 0) {
        return HTTPError('lotSize must be > 0', 400);
      }

      const job = await JobModel.findById(`${jobId}`);

      if (job?.released) {
        return HTTPError('Job cannot be released.', 405);
      }

      await JobModel.updateOne(
        { _id: jobId },
        {
          $set: {
            stdLotSize: lotSize,
          },
        },
      );

      return {};
    },
    res,
    'job std lot',
  );
}

export default JobRouter;
