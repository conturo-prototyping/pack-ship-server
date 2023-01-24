import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { ChaiRequest, TEST_DB_CLIENT } from '../config';
import { SiteModel } from '../../src/site/model';

require('../config'); // recommended way of loading root hooks

const URL = '/sites';

const DB_URL: string = process.env.MONGO_DB_URI!;

const CLIENT = new MongoClient(DB_URL);

describe('# SITE', () => {
  it('Should get a list of all sites.', async () => {
    const siteAId = new ObjectId('111111111111111111111111');
    await insertOneSite({
      id: siteAId,
      name: 'nameA',
      location: 'warioLand',
      timezone: 'pst',
    });

    const siteBId = new ObjectId('222222222222222222222222');
    await insertOneSite({
      id: siteBId,
      name: 'nameB',
      location: 'marioLand',
      timezone: 'est',
    });

    const res = await ChaiRequest('get', `${URL}/`);
    expect(res.body.sites.length).to.be.eq(2);

    const siteA = res.body.sites[0];
    expect(siteA.name).to.be.eq('nameA');
    expect(siteA.location).to.be.eq('warioLand');
    expect(siteA.timezone).to.be.eq('pst');

    const siteB = res.body.sites[1];
    expect(siteB.name).to.be.eq('nameB');
    expect(siteB.location).to.be.eq('marioLand');
    expect(siteB.timezone).to.be.eq('est');
  });
});

async function insertOneSite({
  id,
  name,
  location,
  timezone = 'est',
  staff = [],
  jobQueues = [],
  lotQueues = [],
}) {
  const doc = {
    _id: id,
    name,
    location,
    timezone,
    staff,
    jobQueues,
    lotQueues,
  };
  await TEST_DB_CLIENT.db()
    .collection(SiteModel.collection.name)
    .insertOne(doc);
}
