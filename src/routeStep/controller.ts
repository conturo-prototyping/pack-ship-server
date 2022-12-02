import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { RouteStepModel } from './model';

const router = express.Router();
export default router;

router.put('/', putRouteStep);
router.get('/', allRouteSteps);
router.delete('/', deleteRouteStep);
router.patch('/', patchRouteStep);

/**
 * Insert a RouteStep with the given category and name.
 */
function putRouteStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { category, name } = req.body;

      if (!category) return HTTPError('Step category must be specified.');
      if (!name) return HTTPError('Step name must be specified.');

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
 * Update a RouteStep with the given category and name.
 */
function patchRouteStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { routeStepId, category, name } = req.body;

      if (!routeStepId)
        return HTTPError('Route Step ID must be specified.', 400);

      const routeStep = await RouteStepModel.findById(routeStepId);

      if (!routeStep) return HTTPError('Step does not exist.', 404);

      let updateDict = {};

      if (category) {
        updateDict = { ...updateDict, category };
      }

      if (name) {
        updateDict = { ...updateDict, name };
      }

      await RouteStepModel.updateOne(
        { _id: routeStepId },
        {
          $set: updateDict,
        },
      );

      const data = { message: 'success' };
      return { data };
    },
    res,
    'patching route step',
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

/**
 * Delete a single RouteStep given a routeStep._id
 */
function deleteRouteStep(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { routeStepId } = req.body;
      if (!routeStepId)
        return HTTPError('Route Step ID must be specified.', 400);

      const deletedRouteStep = await RouteStepModel.findByIdAndDelete(
        routeStepId,
      );
      if (!deletedRouteStep) return HTTPError('No Route Step found.', 404);

      const data = { deletedRouteStep };
      return { data };
    },
    res,
    'deleting route step',
  );
}
