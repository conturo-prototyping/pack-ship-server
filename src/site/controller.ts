/* site.controller.ts
 * Controller for sites
 *
 * This is where we handle basic functions of sites.
 */
import { Request, Response, Router } from 'express';
import { ExpressHandler } from '../utils';
import { SiteModel } from './model';

const SiteRouter = Router();
export default SiteRouter;

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

function createSite(_req: Request, res: Response) {
  res.sendStatus(501);
}

function closeSite(_req: Request, res: Response) {
  res.sendStatus(501);
}

function getOneSite(_req: Request, res: Response) {
  res.sendStatus(501);
}

function getSiteMembers(_req: Request, res: Response) {
  res.sendStatus(501);
}

function assignMemberToSite(_req: Request, res: Response) {
  res.sendStatus(501);
}

function removeMemberFromSite(_req: Request, res: Response) {
  res.sendStatus(501);
}
