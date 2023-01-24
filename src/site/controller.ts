/* site.controller.ts
 * Controller for sites
 *
 * This is where we handle basic functions of sites.
 */

import { Request, Response, Router } from 'express';
import { ExpressHandler, HTTPError } from '../utils';
import { SiteModel } from './model';

const router = Router();
export default router;

router.get('/', getAllSites);
router.put('/', createSite);
router.delete('/', closeSite);

router.get('/:siteId', getOneSite);
router.get('/:siteId/members', getSiteMembers);
router.put('/:siteId/members', assignMemberToSite);
router.delete('/:siteId/members', removeMemberFromSite);

function getAllSites(_req: Request, res: Response) {
  res.sendStatus(501);
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
      res.sendStatus(501);

      return {};
    },
    res,
    'closing site',
  );
}

async function getOneSite(_req: Request, res: Response) {
  ExpressHandler(
    async () => {
      res.sendStatus(501);

      return {};
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
