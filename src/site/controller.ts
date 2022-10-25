/* site.controller.ts
 * Controller for sites
 *
 * This is where we handle basic functions of sites.
 */

import { Request, Response, Router } from 'express';

const router = Router();

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
