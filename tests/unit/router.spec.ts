import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient } from 'mongodb';
import { RouteStepModel } from '../../src/routeStep/model';
import { RouteTemplateModel } from '../../src/routeTemplate/model';
import { ChaiRequest, LocalReset } from '../config';

require('../config'); // recommended way of loading root hooks

const ENDPOINT_ROOT_URL = '/routers/';
const ROUTER_TEMPLATE_COLLECTION_NAME = RouteTemplateModel.collection.name;

// set up DB_URL - NOTE: this only works with a local db, if not set up use the /debug/reset route to generate data (this might not be needed)
const DB_URL: string = process.env.MONGO_DB_URI!;

// FYI for this there is a permission issue of trying to go to a new db, currently I don't have a local db set up

const CLIENT = new MongoClient(DB_URL);

describe('# ROUTER', () => {
  // connect to db before all
  before(async () => CLIENT.connect().catch(console.error));

  // teardown after each test
  afterEach(async () => LocalReset());

  it('Export Router name should already exist.', async () => {
    const testName = 'Test Name';
    // create routeStep using mongodb driver
    const doc = {
      name: testName,
      router: [
        {
          id: undefined,
          details: 'Test String',
        },
      ],
    };
    await CLIENT.db()
      .collection(ROUTER_TEMPLATE_COLLECTION_NAME)
      .insertOne(doc);

    try {
      // hit endpoint to get all routeSteps in collection
      const res = await ChaiRequest('post', ENDPOINT_ROOT_URL + 'export', {
        name: testName,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.equal('Template name already exists');
    }
  });

  it('Export Router no name provided.', async () => {
    try {
      await ChaiRequest('post', ENDPOINT_ROOT_URL + 'export');
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('No name provided');
    }
  });

  it('Export Router should create router template.', async () => {
    const testName = 'Test Name';
    // create routeStep using mongodb driver
    const router = {
      name: testName,
      router: [
        {
          id: undefined,
          details: 'Test String',
        },
      ],
    };

    try {
      // hit endpoint to get all routeSteps in collection
      const res = await ChaiRequest('post', ENDPOINT_ROOT_URL + 'export', {
        name: testName,
        router,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.equal('Template name already exists');
    }
  });
});
