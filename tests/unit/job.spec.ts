import { expect } from 'chai';
import { describe, it } from 'mocha';
import { ObjectId } from 'mongodb';
import { RouterModel } from '../../src/router/model';
import { ChaiRequest, TEST_DB_CLIENT } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/jobs';
const COLLECTION_NAME = 'jobs';

describe('# JOB', () => {
  it('Should find 1 inserted job.', async () => {
    // create job using mongodb driver
    const doc = {
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: false,
      onHold: true,
      canceled: true,
      stdLotSize: 1,
    };
    await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).insertOne(doc);

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest('get', `${URL}/`);
    expect(res.body.jobs.length).to.be.eq(1);

    // check data
    const job = res.body.jobs[0];
    expect(job.partId).to.be.eq('partId');
    expect(job.dueDate).to.be.eq('2022/10/14');
    expect(job.batchQty).to.be.eq(1);
    expect(job.material).to.be.eq('moondust');
    expect(job.externalPostProcesses).to.have.members(['pp2', 'pp1']);
    expect(job.lots).to.have.members(['lotId1', 'lotid2']);
    expect(job.released).to.be.eq(false);
    expect(job.onHold).to.be.eq(true);
    expect(job.stdLotSize).to.be.eq(1);
  });

  it('Should find 1 released planning job.', async () => {
    await insertOnePart();
    await insertOneJob({});

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest('get', `${URL}/planningReleased`);
    expect(res.body.jobs.length).to.be.eq(1);

    // check data
    const job = res.body.jobs[0];
    expect(job.released).to.be.eq(true);
    expect(job.canceled).to.be.eq(false);
  });

  it('Should find 0 released planning job.', async () => {
    await insertOneJob({ released: false });

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest('get', `${URL}/planningReleased`);
    expect(res.body.jobs.length).to.be.eq(0);
  });

  it('Should hold a job.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id });

    // hit endpoint to get the job and check if onHold is true
    await ChaiRequest('post', `${URL}/hold`, {
      jobId,
    });
    const actual = await TEST_DB_CLIENT.db()
      .collection(COLLECTION_NAME)
      .findOne({ _id: id });
    expect(actual!.onHold).to.be.eq(true);
  });

  it('Should fail with no jobId provided.', async () => {
    const routes = [
      `${URL}/hold`,
      `${URL}/release`,
      `${URL}/cancel`,
      `${URL}/lotSize`,
    ];

    for (const i in routes) {
      try {
        await ChaiRequest('post', routes[i]);
      } catch (err) {
        expect(err.status).to.be.eq(400);
        expect(err.text).to.be.equal('Please provide a jobId');
      }
    }
  });

  it('Should fail where jobId is provided but does not exist.', async () => {
    const jobId = '111111111111111111111111';

    const routes = [
      `${URL}/hold`,
      `${URL}/release`,
      `${URL}/cancel`,
      `${URL}/lotSize`,
    ];

    for (const i in routes) {
      try {
        await ChaiRequest('post', routes[i], {
          jobId,
        });
      } catch (err) {
        expect(err.status).to.be.eq(404);
        expect(err.text).to.equal(`Job ${jobId} not found`);
      }
    }
  });

  it('Should fail since the job is not released.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id, released: false });

    try {
      await ChaiRequest('post', `${URL}/hold`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.eq(`Job ${jobId} has not been released yet`);
    }
  });

  it('Should fail since the job is onHold already.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id, onHold: true });

    try {
      await ChaiRequest('post', `${URL}/hold`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.eq(`Job ${jobId} is already on hold`);
    } finally {
      // drop collection to maintain stateless tests
      await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).drop();
    }
  });

  it('Should release job from on hold.', async () => {
    const jobId = '111111111111111111111111';
    const jobIdObj = new ObjectId(jobId);
    const routerId = '333333333333333333333333';
    const routerIdObj = new ObjectId(routerId);

    await insertOneRoute(routerIdObj);
    await insertOneJob({
      // @ts-ignore
      id: jobIdObj,
      onHold: true,
      released: false,
      // @ts-ignore
      router: routerIdObj,
    });

    // hit endpoint to get the job and check if onHold is true
    await ChaiRequest('post', `${URL}/release`, {
      jobId,
    });

    const actualJob = await TEST_DB_CLIENT.db()
      .collection(COLLECTION_NAME)
      .findOne({ _id: jobIdObj });
    expect(actualJob!.onHold, 'onhold should be false').to.be.eq(false);
    expect(actualJob!.released, 'released should be true').to.be.eq(true);

    // Make sure route path stepCodes are present and incremented
    const actualRoute = await TEST_DB_CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerIdObj });

    expect(actualRoute!.path[0].stepCode, 'first is 100').to.be.eq(100);
    expect(actualRoute!.path[1].stepCode, 'second is 200').to.be.eq(200);

    // drop collection to maintain stateless tests
    await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).drop();
  });

  it('Should fail since the job is already canceled.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id, canceled: true });

    try {
      await ChaiRequest('post', `${URL}/cancel`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.eq(`Job ${jobId} has already been canceled`);
    } finally {
      // drop collection to maintain stateless tests
      await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).drop();
    }
  });

  it('Should find released job(s) matching orderNumber regex', async () => {
    await insertOneJob({});

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest(
      'get',
      `${URL}/planningReleased/?regexFilter=abc`,
    );
    expect(res.body.jobs.length).to.be.eq(1);

    // check data
    const job = res.body.jobs[0];
    expect(job.released).to.be.eq(true);
    expect(job.canceled).to.be.eq(false);
    expect(job.orderNumber).to.be.eq('ABC1001');
  });

  it('Should find released job(s) matching partDescription regex', async () => {
    await insertOnePart();
    await insertOneJob({});

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest(
      'get',
      `${URL}/planningReleased/?regexFilter=umm`,
    );
    expect(res.body.jobs.length).to.be.eq(1);

    // check data
    const job = res.body.jobs[0];
    expect(job.released).to.be.eq(true);
    expect(job.canceled).to.be.eq(false);
    expect(job.customerParts[0].partDescription).to.be.eq('dummy');
  });

  it('Should find released job(s) matching partNumber regex', async () => {
    await insertOnePart();
    await insertOneJob({});

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest(
      'get',
      `${URL}/planningReleased/?regexFilter=-0`,
    );
    expect(res.body.jobs.length).to.be.eq(1);

    // check data
    const job = res.body.jobs[0];
    expect(job.released).to.be.eq(true);
    expect(job.canceled).to.be.eq(false);
    expect(job.customerParts[0].partNumber).to.be.eq('PN-004');
  });

  it('Should find non-zero lot size.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id, released: false, stdLotSize: 0 });

    // hit endpoint to get update lot size
    await ChaiRequest('post', `${URL}/lotSize`, {
      jobId,
      lotSize: 12,
    });

    const actual = await TEST_DB_CLIENT.db()
      .collection(COLLECTION_NAME)
      .findOne({ _id: id });

    // check data
    expect(actual!.stdLotSize).to.be.eq(12);

    // drop collection to maintain stateless tests
    await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).drop();
  });

  it('lot size needs to be included.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id, released: false, stdLotSize: 0 });

    try {
      // hit endpoint to get update lot size
      await ChaiRequest('post', `${URL}/lotSize`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.eq(`Please provide a lotSize`);
    } finally {
      // drop collection to maintain stateless tests
      await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).drop();
    }
  });

  it('lot size cannot be edited for released job.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id, stdLotSize: 0 });

    try {
      // hit endpoint to get update lot size
      await ChaiRequest('post', `${URL}/lotSize`, {
        jobId,
        lotSize: 12,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.eq(`Job cannot be released.`);
    } finally {
      // drop collection to maintain stateless tests
      await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).drop();
    }
  });

  it('lot size must be greater than 0.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // @ts-ignore
    await insertOneJob({ id, released: false, stdLotSize: 0 });

    try {
      // hit endpoint to get update lot size
      await ChaiRequest('post', `${URL}/lotSize`, {
        jobId,
        lotSize: 0,
      });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.eq(`lotSize must be > 0`);
    } finally {
      // drop collection to maintain stateless tests
      await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).drop();
    }
  });
});

/**
 * Insert a test customerPart document.
 */
const DUMMY_PART_ID = new ObjectId('222222222222222222222222');
async function insertOnePart() {
  const partDoc = {
    _id: DUMMY_PART_ID,
    customerId: '111111111111111111111111',
    partNumber: 'PN-004',
    partDescription: 'dummy',
    partRev: 'A',
  };
  await TEST_DB_CLIENT.db().collection('customerParts').insertOne(partDoc);
}

async function insertOneRoute(id) {
  const routeDoc = {
    _id: id,
    path: [{ step: 'step1' }, { step: 'step2' }],
  };
  await TEST_DB_CLIENT.db()
    .collection(RouterModel.collection.name)
    .insertOne(routeDoc);
}

/**
 * Create a test job document with given criteria
 */
export async function insertOneJob({
  id = undefined,
  released = true,
  onHold = false,
  canceled = false,
  stdLotSize = 1,
  router = undefined,
}) {
  const jobDoc = {
    partId: DUMMY_PART_ID,
    orderNumber: 'ABC1001',
    dueDate: '2022/10/14',
    batchQty: 1,
    material: 'moondust',
    externalPostProcesses: [
      '111111111111111111111111',
      '222222222222222222222222',
    ],
    lots: ['111111111111111111111111', '222222222222222222222222'],
    released,
    onHold,
    canceled,
    stdLotSize,
    router,
  };

  // @ts-ignore
  if (id) jobDoc._id = id;

  await TEST_DB_CLIENT.db().collection(COLLECTION_NAME).insertOne(jobDoc);
}
