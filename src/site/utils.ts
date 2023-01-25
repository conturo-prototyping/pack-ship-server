import express, { NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { SiteModel } from './model';

export async function verifySiteId(
  req: express.Request,
  res: express.Response,
  next: NextFunction,
  check: 'param' | 'body' = 'body',
) {
  const { siteId } = check === 'body' ? req.body : req.params;

  if (!siteId) {
    // Make sure siteId is provided
    res.status(400).send('Please provide a siteId');
  } else if (!ObjectId.isValid(siteId)) {
    // Verify if id is valid
    res.status(404).send(`Site ${siteId} not found`);
  } else {
    // Find the siteId and if it doesnt exist, raise an error
    const site = await SiteModel.findById(siteId);

    // Check if the site exists
    if (!site) {
      res.status(404).send(`Site ${siteId} not found`);
    } else {
      res.locals.site = site;
      next();
    }
  }
}
