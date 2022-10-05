import express = require('express');
import { ExpressHandler } from '../utils';
import { RouteStepModel } from './model';

const router = express.Router();
export default router;

// routes
router.get('/', allRouteSteps);

// functions
function allRouteSteps(_req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const routeSteps = await RouteStepModel.find()
        .lean()
        .select('category name')
        .exec();

      const data = { routeSteps };
      return { data };
    },
    res,
    'getting all routeSteps',
  );
}
