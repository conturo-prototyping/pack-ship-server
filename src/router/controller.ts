import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { RouterModel } from './model';
import { RouteTemplateModel } from '../routeTemplate/model';
import { JobModel } from '../job/model';
import { RouteStepModel } from '../routeStep/model';

const router = express.Router();
export default router;

router.post('/import', importRouter);

/**
 * Pull an existing RouterTemplate into a specified Router.
 */
function importRouter(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { routerTemplateId, routerId } = req.body;

      if (routerId === undefined) {
        return HTTPError('No routerId provided', 400);
      }

      if (routerTemplateId === undefined) {
        return HTTPError('No routerTemplateId provided', 400);
      }

      const routerObj = await RouterModel.findById(routerId);

      if (!routerObj) {
        return HTTPError('Router not found', 404);
      }

      const jobObj = await JobModel.findOne({ router: routerObj._id });

      if (jobObj?.released) {
        return HTTPError('Router is already released', 405);
      }

      const routerTemplate = await RouteTemplateModel.findById(
        routerTemplateId,
      );

      if (!routerTemplate) {
        return HTTPError('Router Template not found', 404);
      }

      const newSteps: any[] = [];

      await Promise.all(
        routerTemplate.steps.map(async (e) => {
          const routeStep = await RouteStepModel.findById(e.id).lean().exec();

          newSteps.push({
            step: { name: routeStep?.name, category: routeStep?.category },
            stepDetails: e.details,
          });
        }),
      );

      await RouterModel.updateOne(
        { _id: routerObj._id },
        { $set: { path: [...routerObj.path, ...newSteps] } },
      );

      return {};
    },
    res,
    'importing router',
  );
}
