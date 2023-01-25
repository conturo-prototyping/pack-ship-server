/* site.controller.ts
 * Controller for sites
 *
 * This is where we handle basic functions of sites.
 */
import { Request, Response, Router } from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { SiteModel } from './model';
import { verifySiteId } from './utils';

const SiteRouter = Router();
export default SiteRouter;

SiteRouter.get(['/:siteId'], async (res, req, next) =>
  verifySiteId(res, req, next, 'param'),
);
SiteRouter.delete(['/'], verifySiteId);

SiteRouter.get('/', getAllSites);
SiteRouter.put('/', createSite);
SiteRouter.delete('/', closeSite);

SiteRouter.get('/:siteId', getOneSite);
SiteRouter.get('/:siteId/members', getSiteMembers);
SiteRouter.put('/:siteId/members', assignMemberToSite);
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
      const { site } = res.locals;
      await SiteModel.deleteOne({ _id: site.id });

      return {};
    },
    res,
    'closing site',
  );
}

async function getOneSite(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      const { site } = res.locals;
      const data = { site };
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
      res.sendStatus(501);

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
