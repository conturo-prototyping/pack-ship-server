/* site.controller.ts
 * Controller for sites
 *
 * This is where we handle basic functions of sites.
 */
import { Request, Response, Router } from 'express';
import { UserModel } from '../user/model';
import { checkId, ExpressHandler, HTTPError } from '../utils';
import { SiteModel } from './model';

const SiteRouter = Router();
export default SiteRouter;

SiteRouter.get(['/:siteId'], (req, res, next) =>
  checkId(res, next, SiteModel, req.params.siteId),
);
SiteRouter.delete(['/'], (req, res, next) =>
  checkId(res, next, SiteModel, req.body.siteId),
);

SiteRouter.get('/', getAllSites);
SiteRouter.put('/', createSite);
SiteRouter.delete('/', closeSite);

SiteRouter.get('/:siteId', getOneSite);
SiteRouter.get('/:siteId/members', getSiteMembers);

SiteRouter.put(
  '/:siteId/members',
  (req, res, next) => checkId(res, next, SiteModel, req.params.siteId),
  (req, res, next) => checkId(res, next, UserModel, req.body.memberId),
  assignMemberToSite,
);

SiteRouter.delete('/:siteId/members', removeMemberFromSite);

/**
 * Get a list of all sites
 */
async function getAllSites(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      const sites = await SiteModel.find().lean();
      const data = { sites };
      return { data };
    },
    res,
    'getting all sites',
  );
}

async function createSite(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      const { name, location, timezone } = _req.body;

      if (!name) {
        return HTTPError('Missing required arg, name.', 400);
      }

      if (!location) {
        return HTTPError('Missing required arg, location.', 400);
      }

      if (!timezone) {
        return HTTPError('Missing required arg, timezone.', 400);
      }

      const existingSite = await SiteModel.findOne({ name });

      if (existingSite) {
        return HTTPError('Name already exists.', 400);
      }

      const siteModel = new SiteModel({
        name,
        location: [location],
        timezone,
      });

      await siteModel.save();
      return {};
    },
    res,
    'creating site',
  );
}

async function closeSite(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      const { data } = res.locals;
      await SiteModel.updateOne(
        { _id: data._id },
        {
          $set: {
            inactive: true,
          },
        },
      );

      return {};
    },
    res,
    'closing site',
  );
}

async function getOneSite(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      const { data } = res.locals;
      return { data };
    },
    res,
    'get one site',
  );
}

async function getSiteMembers(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      res.sendStatus(501);

      return {};
    },
    res,
    'get site members',
  );
}

async function assignMemberToSite(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      const _id = _req.params.siteId;
      const { memberId } = _req.body;

      await SiteModel.updateOne({ _id }, { $push: { staff: memberId } });

      return {};
    },
    res,
    'assign site members',
  );
}

async function removeMemberFromSite(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      res.sendStatus(501);

      return {};
    },
    res,
    'remove members from site',
  );
}
