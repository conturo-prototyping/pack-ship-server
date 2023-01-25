import { expect } from 'chai';
import { describe, it } from 'mocha';
import { ObjectId } from 'mongodb';
import { ChaiRequest, TEST_DB_CLIENT } from '../config';
import { SiteModel } from '../../src/site/model';
import { UserModel } from '../../src/user/model';

require('../config'); // recommended way of loading root hooks

const URL = '/sites';

describe('# SITE', () => {
  it('Insert a new site.', async () => {
    await ChaiRequest('put', `${URL}/`, {
      name: 'TEST SITE',
      location: 'TEST',
      timezone: 'EST',
    });
    const site = await TEST_DB_CLIENT.db()
      .collection(SiteModel.collection.name)
      .findOne({ name: 'TEST SITE' });
    expect(site.name).to.be.eq('TEST SITE');
    expect(site.location[0]).to.be.eq('TEST');
    expect(site.timezone).to.be.eq('EST');
  });

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

  it('Should get a single id with :siteId.', async () => {
    const id = '111111111111111111111111';
    const siteAId = new ObjectId(id);
    await insertOneSite({
      id: siteAId,
      name: 'nameA',
      location: ['warioLand', "bowser's castle"],
      timezone: 'pst',
    });

    const res = await ChaiRequest('get', `${URL}/${id}`);
    const siteA = res.body;

    expect(siteA.name).to.be.eq('nameA');
    expect(siteA.location[0]).to.be.eq('warioLand');
    expect(siteA.location[1]).to.be.eq("bowser's castle");
    expect(siteA.timezone).to.be.eq('pst');
  });

  it('Attempt to get site with nonexistant :siteId.', async () => {
    try {
      await ChaiRequest('get', `${URL}/111111111111111111111111`);
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(
        '111111111111111111111111 for sites not found',
      );
    }
  });

  it('Insert a new site.', async () => {
    await ChaiRequest('put', `${URL}/`, {
      name: 'TEST SITE',
      location: 'TEST',
      timezone: 'EST',
    });
  });

  it('Insert a new site.', async () => {
    await ChaiRequest('put', `${URL}/`, {
      name: 'TEST SITE',
      location: 'TEST',
      timezone: 'EST',
    });

    const site = await TEST_DB_CLIENT.db()
      .collection(SiteModel.collection.name)
      .findOne({ name: 'TEST SITE' });

    expect(site.name).to.be.eq('TEST SITE');
    expect(site.location[0]).to.be.eq('TEST');
    expect(site.timezone).to.be.eq('EST');
  });

  it('Insert a new site name missing.', async () => {
    try {
      await ChaiRequest('put', `${URL}/`, {
        location: 'TEST',
        timezone: 'EST',
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Missing required arg, name.');
    }
  });

  it('Insert a new site location missing.', async () => {
    try {
      await ChaiRequest('put', `${URL}/`, {
        name: 'TEST SITE',
        timezone: 'EST',
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Missing required arg, location.');
    }
  });

  it('Insert a new site timezone missing.', async () => {
    try {
      await ChaiRequest('put', `${URL}/`, {
        name: 'TEST SITE',
        location: 'TEST',
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Missing required arg, timezone.');
    }
  });

  it('Insert a new site name missing.', async () => {
    const siteAId = new ObjectId('111111111111111111111111');
    await insertOneSite({ id: siteAId, name: 'TEST SITE', location: 'TEST' });
    try {
      await ChaiRequest('put', `${URL}/`, {
        name: 'TEST SITE',
        location: 'TEST',
        timezone: 'EST',
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Name already exists.');
    }
  });

  it('Update a member.', async () => {
    const siteAId = new ObjectId('111111111111111111111111');
    await insertOneSite({ id: siteAId, name: 'TEST SITE', location: 'TEST' });

    const memberId = new ObjectId('222222222222222222222222');
    await insertUser({ id: memberId });

    await ChaiRequest('put', `${URL}/${siteAId}/members`, {
      memberId: memberId.toString(),
    });

    const site = await TEST_DB_CLIENT.db()
      .collection(SiteModel.collection.name)
      .findOne({ _id: siteAId });

    expect(site.staff[0].toString()).to.be.eq('222222222222222222222222');
  });

  it('Update a member fails on site exists.', async () => {
    const memberId = new ObjectId('222222222222222222222222');
    await insertUser({ id: memberId });

    try {
      await ChaiRequest('put', `${URL}/111111111111111111111111/members`, {
        memberId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(
        '111111111111111111111111 for sites not found',
      );
    }
  });

  it('Update a member fails on site exists.', async () => {
    const siteAId = new ObjectId('111111111111111111111111');
    await insertOneSite({ id: siteAId, name: 'TEST SITE', location: 'TEST' });
    const memberId = new ObjectId('222222222222222222222222');
    await insertUser({ id: memberId });

    try {
      await ChaiRequest('put', `${URL}/${siteAId}/members`);
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Please provide an id for users');
    }
  });

  it("Update a member fails on member doesn't exist.", async () => {
    const siteAId = new ObjectId('111111111111111111111111');
    await insertOneSite({ id: siteAId, name: 'TEST SITE', location: 'TEST' });
    const memberId = new ObjectId('222222222222222222222222');

    try {
      await ChaiRequest('put', `${URL}/${siteAId}/members`, {
        memberId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(
        '222222222222222222222222 for users not found',
      );
    }
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

async function insertUser({ id }) {
  const doc = {
    _id: id,
  };
  await TEST_DB_CLIENT.db()
    .collection(UserModel.collection.name)
    .insertOne(doc);
}
