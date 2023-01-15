import express from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { RouteTemplateModel } from '../routeTemplate/model';

// eslint-disable-next-line @typescript-eslint/naming-convention
const _router = express.Router();
export default _router;

_router.post('/export', exportRouter);

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
