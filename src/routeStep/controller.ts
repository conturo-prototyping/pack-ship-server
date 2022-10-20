import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { RouteStepModel } from './model';

const router = express.Router();
export default router;

router.put('/', putRouteStep);
router.get('/', allRouteSteps);

/**
 * Insert a RouteStep with the given category and name.
 */
function putRouteStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { category, name } = req.body;

      if (!category) return HTTPError('no step category');
      if (!name) return HTTPError('no step name');

      const newRouteStep = new RouteStepModel({ category, name });
      await newRouteStep.save();

      const data = { message: 'success' };
      return { data };
    },
    res,
    'putting route step',
  );
}

/**
 * Get all existing Route Steps.
 */
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
