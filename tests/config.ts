require('dotenv').config();

import { Express } from 'express';
import { ObjectId } from 'mongoose';
import { UserModel } from '../src/user/model';
import { DropAllCollections } from '../src/router.debug';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { join } from 'path';

process.env.MONGO_DB_URI += '--TEST';
process.env.NODE_ENV = 'TEST';
// console.log = function() {};

// This lets us avoid requiring app in every single test directory & subdirectory.
chai.use(chaiHttp);
let app: Express;

// We can't pull models into runtime until we've made a connection to the usual DB
//  copied critical collections over, and then change the connection back.
let User: typeof UserModel;


// @ts-ignore
require.main.require = name => {
  const newPath = join(__dirname, '../src', name);
  return require(newPath);
};

// SETUP
// Set up a temp DB
let TEST_USER_ID: ObjectId;
before(async () => {
  // Use a test DB & copy essential collections to it
  let dbUrl = process.env.MONGO_DB_URI;
  dbUrl = dbUrl!.substring(0, dbUrl!.lastIndexOf('--TEST') );

  // Load app here, so it's cached for future tests
  app = require('../src/app');
});

// TEAR DOWN
// Clear out all TEST DB collections
after(async () => await DropAllCollections() );

// ----------------------------------------------------------
// ----------------------------------------------------------
// -------------------USEFUL TESTING HELPERS-----------------
// ----------------------------------------------------------
// ----------------------------------------------------------

export function GetUserId() {
  return TEST_USER_ID;
}

export async function ChaiRequest(method, url, payload={}, throwError = true) {
  const user = await User.findOne();
  if (!user) throw Error('No users found. Create at least one user with Google OAuth2 to proceed.');

  app.request.user = user;
  app.request.isAuthenticated = function() { return true; };

  const res = await chai.request(app)
    [method](url)
    .send(payload);

  if  (throwError && res.status !== 200 && res.status !== 201 ){
    throw res.data;
  };

  return res;
};

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
  await Promise.all(TEARDOWN_CALLBACKS.map(x => x()));
};
