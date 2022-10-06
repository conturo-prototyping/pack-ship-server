import { expect } from "chai";
import { describe, it } from "mocha";
import { ChaiRequest } from "../config";
import { MongoClient } from 'mongodb';
require('../config'); // recommended way of loading root hooks

const URL = '/routeSteps';

// set up DB_URL
let DB_URL = process.env.MONGO_DB_URI;
console.debug(DB_URL)
DB_URL = DB_URL!.substring(0, DB_URL!.lastIndexOf('--TEST') )
// console.debug(DB_URL)
const _DB_URL = DB_URL?.split('?');
console.debug(_DB_URL);
DB_URL = _DB_URL[0] + '-test?' + _DB_URL[1];
console.debug(DB_URL)

//FYI for this there is a permission issue of trying to go to a new db, currently I don't have a local db set up

const CLIENT = new MongoClient( DB_URL, { useUnifiedTopology: true } );

describe('# ROUTE STEPS', () => {
  it('Should find 1 inserted routeStep from collection.' , async () => {

    // set up connection to db
    // await CLIENTConnect();
    await CLIENT.connect();

    // create routeStep using mongodb driver
    const doc = {
      name: 'for testing',
      category: 'testing...'
    };
    await CLIENT.db().collection('routeSteps').insertOne(doc);

    // hit endpoint to get all routeSteps in collection
    const res = await ChaiRequest('get', URL + '/');
    const numOfRouteSteps = res.body.routeSteps.length;

    expect(numOfRouteSteps).to.be.eq(1);
  })
})