import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient } from 'mongodb';
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
  before(async () => CLIENT.connect().catch(console.error));
  
  // teardown after each test
  afterEach(async () => LocalReset());

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
    await ChaiRequest('put', ENDPOINT_ROOT_URL, { category: 'cat', name: 'nam' });
    const sniff = await CLIENT.db().collection(COLLECTION_NAME).find().toArray();

    expect(sniff.length).to.be.eq(1);
  });

  it('DELETE /routeStep should delete 1 successfully.', async () => {
    await CLIENT.db().collection(COLLECTION_NAME).insertOne({ category: 'cat', name: 'nam' });
    const doc = await CLIENT.db().collection(COLLECTION_NAME).findOne();

    await ChaiRequest('delete', ENDPOINT_ROOT_URL, { routeStepId: doc!._id });
    const sniff = await CLIENT.db().collection(COLLECTION_NAME).find().toArray();

    expect(sniff.length).to.be.eq(0);
  })
});
