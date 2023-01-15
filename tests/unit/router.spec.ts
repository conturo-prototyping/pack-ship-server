import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { JobModel } from '../../src/job/model';
import { RouterModel } from '../../src/router/model';
import { RouteStepModel } from '../../src/routeStep/model';
import { RouteTemplateModel } from '../../src/routeTemplate/model';
import { ChaiRequest, LocalReset } from '../config';

require('../config'); // recommended way of loading root hooks

const ENDPOINT_ROOT_URL = '/routers/';
const JOB_COLLECTION_NAME = JobModel.collection.name;
const ROUTER_COLLECTION_NAME = RouterModel.collection.name;
const ROUTE_STEP_COLLECTION_NAME = RouteStepModel.collection.name;
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

  it('Import Router name no router ID.', async () => {
    try {
      // hit endpoint to get all routeSteps in collection
      await ChaiRequest('post', ENDPOINT_ROOT_URL + 'import');
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('No routerId provided');
    }
  });

  it('Import Router name no router template ID', async () => {
    try {
      await ChaiRequest('post', ENDPOINT_ROOT_URL + 'import', {
        routerId: '111111111111111111111111',
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('No routerTemplateId provided');
    }
  });

  it('Import Router job released', async () => {
    const routerId = '111111111111111111111111';
    const id = new ObjectId(routerId);

    // create job using mongodb driver
    const jobDoc = {
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: true,
      onHold: true,
      canceled: true,
      router: id,
      stdLotSize: 1,
    };

    await CLIENT.db().collection(JOB_COLLECTION_NAME).insertOne(jobDoc);

    const routerDoc = {
      _id: id,
      path: [
        {
          step: {
            category: 'test',
            name: 'test',
          },
          stepCode: 1,
          stepDetails: '',
        },
      ],
    };

    await CLIENT.db().collection(ROUTER_COLLECTION_NAME).insertOne(routerDoc);

    try {
      await ChaiRequest('post', ENDPOINT_ROOT_URL + 'import', {
        routerId,
        routerTemplateId: '111111111111111111111111',
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.equal('Router is already released');
    }
  });

  it('Import Router router not found', async () => {
    const routerId = '111111111111111111111111';
    const id = new ObjectId(routerId);

    try {
      await ChaiRequest('post', ENDPOINT_ROOT_URL + 'import', {
        routerId: id,
        routerTemplateId: '1',
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal('Router not found');
    }
  });

  it('Import Router router template not found', async () => {
    const routerId = '111111111111111111111111';
    const id = new ObjectId(routerId);

    // create job using mongodb driver
    const jobDoc = {
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: false,
      onHold: true,
      canceled: true,
      router: id,
      stdLotSize: 1,
    };

    await CLIENT.db().collection(JOB_COLLECTION_NAME).insertOne(jobDoc);

    const routerDoc = {
      _id: id,
      path: [
        {
          step: {
            category: 'test',
            name: 'test',
          },
          stepCode: 1,
          stepDetails: '',
        },
      ],
    };

    await CLIENT.db().collection(ROUTER_COLLECTION_NAME).insertOne(routerDoc);

    try {
      await ChaiRequest('post', ENDPOINT_ROOT_URL + 'import', {
        routerId,
        routerTemplateId: '111111111111111111111111',
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal('Router Template not found');
    }
  });

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

  it('Import Router router should import existing steps', async () => {
    const routerId = '111111111111111111111111';
    const id = new ObjectId(routerId);

    // create job using mongodb driver
    const jobDoc = {
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: false,
      onHold: true,
      canceled: true,
      router: id,
      stdLotSize: 1,
    };

    await CLIENT.db().collection(JOB_COLLECTION_NAME).insertOne(jobDoc);

    const routerDoc = {
      _id: id,
      path: [
        {
          step: {
            category: 'test',
            name: 'test',
          },
          stepCode: 1,
          stepDetails: '',
        },
      ],
    };

    await CLIENT.db().collection(ROUTER_COLLECTION_NAME).insertOne(routerDoc);

    const routeSteps = {
      _id: id,
      category: 'category',
      name: 'Test name',
    };

    await CLIENT.db()
      .collection(ROUTE_STEP_COLLECTION_NAME)
      .insertOne(routeSteps);

    const routerTemplate = {
      _id: id,
      name: 'Test Name',
      steps: [
        {
          id: id,
          details: 'details',
        },
      ],
    };

    await CLIENT.db()
      .collection(ROUTER_TEMPLATE_COLLECTION_NAME)
      .insertOne(routerTemplate);

    await ChaiRequest('post', ENDPOINT_ROOT_URL + 'import', {
      routerId,
      routerTemplateId: routerId,
    });

    const routerData = await CLIENT.db()
      .collection(ROUTER_COLLECTION_NAME)
      .findOne({ _id: id });

    expect(routerData!.path[0].step.category).to.be.equal('test');
    expect(routerData!.path[0].step.name).to.be.equal('test');
    expect(routerData!.path[0].stepCode).to.be.equal(1);
    expect(routerData!.path[0].stepDetails).to.be.equal('');

    expect(routerData!.path[1].step.category).to.be.equal('category');
    expect(routerData!.path[1].step.name).to.be.equal('Test name');
    expect(routerData!.path[1].stepCode).to.be.equal(undefined);
    expect(routerData!.path[1].stepDetails).to.be.equal('details');
  });
});
