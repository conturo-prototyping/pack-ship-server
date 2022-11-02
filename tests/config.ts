import { Express } from 'express';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { DropAllCollections } from '../src/router.debug';
import { MongoClient } from 'mongodb';

require('dotenv').config();

const passportStub = require('passport-stub-es6');

process.env.MONGO_DB_URI += '--TEST';
process.env.NODE_ENV = 'TEST';
// console.log = function() {};

// This lets us avoid requiring app in every single test directory & subdirectory.
let APP: Express;

chai.use(chaiHttp);

// SETUP
// Start the app with the fake DB path & stub a fake user for all auth endpoints.
before(async () => {
  const { app } = await import('../src/app');

  passportStub.install(app);
  passportStub.login({ UserName: 'Frank the Tank' });

  APP = app;

  await TEST_DB_CLIENT.connect().catch(console.error);
});

// TEAR DOWN
// Clear out all TEST DB collections
after(async () => {
  // await DropAllCollections();
  await TEST_DB_CLIENT.db().dropDatabase();
  await TEST_DB_CLIENT.close();
});

// Use this db client as needed in spec files
export const TEST_DB_CLIENT = new MongoClient(process.env.MONGO_DB_URI!);

// ----------------------------------------------------------
// ----------------------------------------------------------
// -------------------USEFUL TESTING HELPERS-----------------
// ----------------------------------------------------------
// ----------------------------------------------------------

export async function ChaiRequest(
  method: string,
  url: string,
  payload: Object = {},
  throwError: Boolean = true,
) {
  const res = await chai.request(APP)[method](url).send(payload);

  if (throwError && res.status !== 200 && res.status !== 201) {
    throw res.error;
  }

  return res;
}

/**
 * Used to push any special teardown routines.
 * For example, if a test suite updated a critical collection, and we want to reset some fields.
 *
 * Used by LocalReset.
 */
let TEARDOWN_CALLBACKS: Function[] = [];
export function SetTeardowns(...teardownCallbacks: Function[]) {
  TEARDOWN_CALLBACKS = [];
  TEARDOWN_CALLBACKS.push(...teardownCallbacks);
}

/**
 * Useful function to do a hard reset between test suites.
 * If there are special teardowns that need to happen (e.g. change update critical collections)
 *  make sure to use SetTeardowns() first.
 */
export async function LocalReset() {
  await DropAllCollections();
  await Promise.all(TEARDOWN_CALLBACKS.map((x) => x()));
}
