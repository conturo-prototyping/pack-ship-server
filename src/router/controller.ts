import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { RouteTemplateModel } from '../routeTemplate/model';

const router = express.Router();
export default router;

router.post('/export', exportRouter);

function exportRouter(req: express.Request, res: express.Response) {
  ExpressHandler(
    async () => {
      const { name, router } = req.body;

      if (!name) {
        return HTTPError('No name provided', 400);
      }

      const templateRouter = await RouteTemplateModel.findOne({ name })
        .lean()
        .exec();

      if (templateRouter) {
        return HTTPError('Template name already exists', 405);
      }

      new RouteTemplateModel({ name, steps: router }).save();

      return {};
    },
    res,
    'exporting route template',
  );
}
