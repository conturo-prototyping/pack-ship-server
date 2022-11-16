import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { RouterModel } from './model';
import { RouteTemplateModel } from '../routeTemplate/model';

const router = express.Router();
export default router;

router.post('/import', importRouter);

/**
 * Delete a single RouteStep given a routeStep._id
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

      // if (routerObj?.released) {
      //   return HTTPError('Router is already released', 405);
      // }

      const routerTemplate = await RouteTemplateModel.findById(
        routerTemplateId,
      );

      if (!routerTemplate) {
        return HTTPError('Router Template not found', 404);
      }

      await RouterModel.updateOne(
        { _id: routerObj._id },
        { $set: { path: [...routerObj.path] } },
      );

      return {};
    },
    res,
    'deleting route step',
  );
}
