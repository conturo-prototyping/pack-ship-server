import express from 'express';
import { JobModel } from './model';
import { ExpressHandler } from '../utils';

const JobRouter = express.Router();
JobRouter.get('/', getJobs);

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

export default JobRouter;
