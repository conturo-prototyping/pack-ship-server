import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { RouteStepModel } from '../../src/routeStep/model';
import { ChaiRequest, LocalReset } from '../config';

require('../config'); // recommended way of loading root hooks

const ENDPOINT_ROOT_URL = '/routeSteps/';
const COLLECTION_NAME = RouteStepModel.collection.name;

// set up DB_URL - NOTE: this only works with a local db, if not set up use the /debug/reset route to generate data (this might not be needed)
const DB_URL: string = process.env.MONGO_DB_URI!;

// FYI for this there is a permission issue of trying to go to a new db, currently I don't have a local db set up

const CLIENT = new MongoClient(DB_URL);

describe('# ROUTE STEPS', () => {
  // connect to db before all
  before(async () => await CLIENT.connect().catch(console.error));

  // teardown after each test
  afterEach(async () => await LocalReset());

  it('GET /routeStep should find single document.', async () => {
    // create routeStep using mongodb driver
    const doc = {
      name: 'for testing',
      category: 'testing...',
    };
    await CLIENT.db().collection(COLLECTION_NAME).insertOne(doc);

    // hit endpoint to get all routeSteps in collection
    const res = await ChaiRequest('get', ENDPOINT_ROOT_URL);
    const numOfRouteSteps = res.body.routeSteps.length;

    expect(numOfRouteSteps).to.be.eq(1);
  });

  it('PUT /routeStep should insert 1 successfully.', async () => {
    await ChaiRequest('put', ENDPOINT_ROOT_URL, {
      category: 'cat',
      name: 'nam',
    });
    const sniff = await CLIENT.db()
      .collection(COLLECTION_NAME)
      .find()
      .toArray();

    expect(sniff.length).to.be.eq(1);
  });

  it('DELETE /routeStep should delete 1 successfully.', async () => {
    await CLIENT.db()
      .collection(COLLECTION_NAME)
      .insertOne({ category: 'cat', name: 'nam' });
    const doc = await CLIENT.db().collection(COLLECTION_NAME).findOne();

    await ChaiRequest('delete', ENDPOINT_ROOT_URL, { routeStepId: doc!._id });
    const sniff = await CLIENT.db()
      .collection(COLLECTION_NAME)
      .find()
      .toArray();

    expect(sniff.length).to.be.eq(0);
  });

  it('PATCH /routeStep should update category correctly.', async () => {
    const stepId = '111111111111111111111111';
    const id = new ObjectId(stepId);

    const doc = {
      _id: id,
      name: 'for testing',
      category: 'testing...',
    };
    await CLIENT.db().collection(COLLECTION_NAME).insertOne(doc);

    await ChaiRequest('patch', ENDPOINT_ROOT_URL, {
      routeStepId: stepId,
      category: 'newcat',
    });
    const newDoc = await CLIENT.db()
      .collection(COLLECTION_NAME)
      .findOne({ _id: id });

    expect(newDoc.category).to.be.eq('newcat');
    expect(newDoc.name).to.be.eq('for testing');
  });

  it('PATCH /routeStep should update name correctly.', async () => {
    const stepId = '111111111111111111111111';
    const id = new ObjectId(stepId);

    const doc = {
      _id: id,
      name: 'for testing',
      category: 'testing...',
    };
    await CLIENT.db().collection(COLLECTION_NAME).insertOne(doc);

    await ChaiRequest('patch', ENDPOINT_ROOT_URL, {
      routeStepId: stepId,
      name: 'newname',
    });
    const newDoc = await CLIENT.db()
      .collection(COLLECTION_NAME)
      .findOne({ _id: id });

    expect(newDoc.category).to.be.eq('testing...');
    expect(newDoc.name).to.be.eq('newname');
  });

  it('PATCH /routeStep should update name and category correctly.', async () => {
    const stepId = '111111111111111111111111';
    const id = new ObjectId(stepId);

    const doc = {
      _id: id,
      name: 'for testing',
      category: 'testing...',
    };
    await CLIENT.db().collection(COLLECTION_NAME).insertOne(doc);

    await ChaiRequest('patch', ENDPOINT_ROOT_URL, {
      routeStepId: stepId,
      category: 'newcat',
      name: 'newname',
    });
    const newDoc = await CLIENT.db()
      .collection(COLLECTION_NAME)
      .findOne({ _id: id });

    expect(newDoc.category).to.be.eq('newcat');
    expect(newDoc.name).to.be.eq('newname');
  });

  it('PATCH /routeStep should error with no routeStepId.', async () => {
    const stepId = '111111111111111111111111';
    const id = new ObjectId(stepId);

    const doc = {
      _id: id,
      name: 'for testing',
      category: 'testing...',
    };
    await CLIENT.db().collection(COLLECTION_NAME).insertOne(doc);

    try {
      await ChaiRequest('patch', ENDPOINT_ROOT_URL, {
        category: 'newcat',
        name: 'newname',
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Route Step ID must be specified.');
      return;
    }

    assert.fail(0, 1, 'Exception not thrown');
  });

  it('PATCH /routeStep should error with no RouteStep to update.', async () => {
    const stepId = '111111111111111111111111';

    try {
      await ChaiRequest('patch', ENDPOINT_ROOT_URL, {
        routeStepId: stepId,
        category: 'newcat',
        name: 'newname',
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal('Step does not exist.');
      return;
    }

    assert.fail(0, 1, 'Exception not thrown');
  });
});
