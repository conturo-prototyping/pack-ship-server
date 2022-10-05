import { expect } from "chai";
import { describe, it } from "mocha";
import { ChaiRequest } from "../config";
import { MongoClient } from 'mongodb';
require('../config'); // recommended way of loading root hooks

const url = '/routeSteps';

// set up dbUrl
let dbUrl = process.env.MONGO_DB_URI;
dbUrl = dbUrl!.substring(0, dbUrl!.lastIndexOf('--TEST') )

const client = new MongoClient( dbUrl, { useUnifiedTopology: true } );

async function clientConnect() {
  try {
    await client.connect();
    // console.debug('--- client connected ---');
  } 
  catch (error) {
    console.debug(error);
  }
}

describe('# ROUTE STEPS', () => {
  it('Should find 1 inserted routeStep from collection.' , async () => {

    // set up connection to db
    await clientConnect();

    // create routeStep using mongodb driver
    const doc = {
      name: 'for testing',
      category: 'testing...'
    };
    await client.db().collection('routeSteps').insertOne(doc);

    // hit endpoint to get all routeSteps in collection
    const res = await ChaiRequest('get', url + '/');
    const numOfRouteSteps = res.body.routeSteps.length;

    expect(numOfRouteSteps).to.be.eq(1);
  })
})