import express from 'express';
import { ObjectId } from 'mongodb';
import { JobModel } from './model';
import { ExpressHandler, HTTPError } from '../utils';

const JobRouter = express.Router();
JobRouter.get('/', getJobs);
JobRouter.get('/planningReleased', getPlanningReleased);

// Middleware to verify jobId exists in the req body
// as well as if the jobId pertains to a valid job
JobRouter.post(['/hold', '/release', '/cancel'], async (req, res, next) => {
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
});

JobRouter.post('/hold', holdJob);
JobRouter.post('/release', releaseJob);
JobRouter.post('/cancel', cancelJob);

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
  _req: express.Request,
  res: express.Response,
) {
  ExpressHandler(
    async () => {
      const jobs = await JobModel.find({
        released: true,
        canceled: false,
      }).lean();

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

export default JobRouter;
