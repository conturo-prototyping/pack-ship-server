import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { DropAllCollections } from '../../src/router.debug';
import { ChaiRequest } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/jobs';

const DB_URL: string = process.env.MONGO_DB_URI!;

const CLIENT = new MongoClient(DB_URL);

describe('# JOB', () => {
  before(async function () {
    await CLIENT.connect().catch(console.error);
  });
  afterEach(async function () {
    await DropAllCollections();
  });
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
    await CLIENT.db().collection('jobs').insertOne(doc);

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
    // create a planning released job
    const doc = {
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: true,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest('get', `${URL}/planningReleased`);
    expect(res.body.jobs.length).to.be.eq(1);

    // check data
    const job = res.body.jobs[0];
    expect(job.released).to.be.eq(true);
    expect(job.canceled).to.be.eq(false);
  });

  it('Should find 0 released planning job.', async () => {
    // create a planning released job
    const doc = {
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: false,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

    // hit endpoint to get all jobs in collection
    const res = await ChaiRequest('get', `${URL}/planningReleased`);
    expect(res.body.jobs.length).to.be.eq(0);
  });

  it('Should hold a job.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);

    // create a planning released job
    const doc = {
      _id: id,
      partId: '222222222222222222222222',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [
        '111111111111111111111111',
        '222222222222222222222222',
      ],
      lots: ['111111111111111111111111', '222222222222222222222222'],
      released: true,
      onHold: false,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

    // hit endpoint to get the job and check if onHold is true
    const res = await ChaiRequest('post', `${URL}/hold`, {
      jobId,
    });
    const actual = await CLIENT.db().collection('jobs').findOne({ _id: id });
    expect(actual.onHold).to.be.eq(true);
  });

  it('Should fail with no jobId provided.', async () => {
    try {
      await ChaiRequest('post', `${URL}/hold`);
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.eq('Please provide a jobId');
    }
  });

  it('Should fail where jobId is provided but does not exist.', async () => {
    const jobId = '111111111111111111111111';
    try {
      await ChaiRequest('post', `${URL}/hold`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.eq(`Job ${jobId} not found`);
    }
  });

  it('Should fail since the job is not released.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);
    const doc = {
      _id: id,
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: false,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

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
    const doc = {
      _id: id,
      partId: 'partId',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: ['pp2', 'pp1'],
      lots: ['lotId1', 'lotid2'],
      released: true,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

    try {
      await ChaiRequest('post', `${URL}/hold`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.eq(`Job ${jobId} is already on hold`);
    } finally {
      // drop collection to maintain stateless tests
      await CLIENT.db().collection('jobs').drop();
    }
  });

  it('Should fail with no jobId provided.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    try {
      await ChaiRequest('post', `${URL}/release`);
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.eq('Please provide a jobId');
    }
  });

  it('Should fail where jobId is provided but does not exist.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);
    const jobId = '111111111111111111111111';
    try {
      await ChaiRequest('post', `${URL}/release`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.eq(`Job ${jobId} not found`);
    }
  });

  it('Should release job from on hold.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);
    const doc = {
      _id: id,
      partId: '222222222222222222222222',
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [
        '111111111111111111111111',
        '222222222222222222222222',
      ],
      lots: ['111111111111111111111111', '222222222222222222222222'],
      released: false,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

    // hit endpoint to get the job and check if onHold is true
    const res = await ChaiRequest('post', `${URL}/release`, {
      jobId,
    });

    const actual = await CLIENT.db().collection('jobs').findOne({ _id: id });
    expect(actual.onHold, 'onhold should be false').to.be.eq(false);
    expect(actual.released, 'released should be true').to.be.eq(true);

    // drop collection to maintain stateless tests
    await CLIENT.db().collection('jobs').drop();
  });
});
