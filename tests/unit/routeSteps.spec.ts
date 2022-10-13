import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient } from 'mongodb';
import { ChaiRequest } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/routeSteps';

// set up DB_URL - NOTE: this only works with a local db, if not set up use the /debug/reset route to generate data (this might not be needed)
const DB_URL: string = process.env.MONGO_DB_URI!;

// FYI for this there is a permission issue of trying to go to a new db, currently I don't have a local db set up

const CLIENT = new MongoClient(DB_URL);

describe('# ROUTE STEPS', () => {
  it('Should find 1 inserted routeStep from collection.', async () => {
    // set up connection to db
    // await CLIENTConnect();
    await CLIENT.connect().catch(console.error);

    // create routeStep using mongodb driver
    const doc = {
      name: 'for testing',
      category: 'testing...',
    };
    await CLIENT.db().collection('routeSteps').insertOne(doc);

    // hit endpoint to get all routeSteps in collection
    const res = await ChaiRequest('get', `${URL}/`);
    const numOfRouteSteps = res.body.routeSteps.length;

    expect(numOfRouteSteps).to.be.eq(1);
  });
});
