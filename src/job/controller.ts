import express from 'express';
import { JobModel } from './model';
import { ExpressHandler, HTTPError } from '../utils';

const JobRouter = express.Router();
JobRouter.get('/', getJobs);
JobRouter.get('/planningReleased', getPlanningReleased);
JobRouter.post('/hold', holdJob);
JobRouter.post('/release', releaseJob);

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

async function holdJob(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { jobId } = req.body;

      // Make sure jobId is provided
      if (!jobId) {
        return HTTPError('Please provide a jobId', 400);
      }

      // Find the job and if it doesnt exist, raise an error
      const job = await JobModel.findById(jobId);

      // Check if the job exists
      if (!job) {
        return HTTPError(`Job ${jobId} not found`, 404);
      }

      // If the job is not released, then do not hold
      if (!job.released) {
        return HTTPError(`Job ${jobId} has not been released yet`, 405);
      }

      // Do not update a job that is already on hold
      if (job.onHold) {
        return HTTPError(`Job ${jobId} is already on hold`, 405);
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

async function releaseJob(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { jobId } = req.body;

      // Make sure jobId is provided
      if (!jobId) {
        return HTTPError('Please provide a jobId', 400);
      }

      // Find the job and if it doesnt exist, raise an error
      const job = await JobModel.findById(jobId);

      // Check if the job exists
      if (!job) {
        return HTTPError(`Job ${jobId} not found`, 404);
      }

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

export default JobRouter;
