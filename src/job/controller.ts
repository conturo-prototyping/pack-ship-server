import express from 'express';
import { JobModel } from './model';
import { ExpressHandler } from '../utils';

const JobRouter = express.Router();
JobRouter.get('/', getJobs);
JobRouter.get('/planningReleased', getPlanningReleased);

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

export default JobRouter;
