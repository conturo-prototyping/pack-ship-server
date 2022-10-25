import { expect } from 'chai';
import { describe, it } from 'mocha';
import { JobModel } from '../../src/job/model';
import { MongoClient, ObjectId } from 'mongodb';
import { DropAllCollections } from '../../src/router.debug';
import { ChaiRequest } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/jobs';
const COLLECTION_NAME = JobModel.collection.name;

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
    await CLIENT.db().collection( 'jobs' ).insertOne(doc);

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
    // Create a part and a job
    const partId = new ObjectId('222222222222222222222222');
    const partDoc = {
      _id: partId,
      customerId: '111111111111111111111111',
      partNumber: 'PN-004',
      partDescription: 'dummy',
      partRev: 'A',
    };
    await CLIENT.db().collection('customerParts').insertOne(partDoc);

    // create a planning released job
    const jobDoc = {
      partId: partId,
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [
        '111111111111111111111111',
        '222222222222222222222222',
      ],
      lots: ['111111111111111111111111', '222222222222222222222222'],
      released: true,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

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
    expect(actual!.onHold, 'onhold should be false').to.be.eq(false);
    expect(actual!.released, 'released should be true').to.be.eq(true);

    // drop collection to maintain stateless tests
    await CLIENT.db().collection('jobs').drop();
  });

  it('Should fail since the job is already canceled.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

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
      canceled: true,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

    try {
      await ChaiRequest('post', `${URL}/cancel`, {
        jobId,
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.eq(`Job ${jobId} has already been canceled`);
    } finally {
      // drop collection to maintain stateless tests
      await CLIENT.db().collection('jobs').drop();
    }
  });


  it('Should find released job(s) matching orderNumber regex', async () => {
    // Create a part and a job
    const partId = new ObjectId('222222222222222222222222');
    const partDoc = {
      _id: partId,
      customerId: '111111111111111111111111',
      partNumber: 'PN-004',
      partDescription: 'dummy',
      partRev: 'A',
    };
    await CLIENT.db().collection('customerParts').insertOne(partDoc);

    // create a planning released job
    const jobDoc = {
      orderNumber: 'ABC1001',
      partId: partId,
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [
        '111111111111111111111111',
        '222222222222222222222222',
      ],
      lots: ['111111111111111111111111', '222222222222222222222222'],
      released: true,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

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
    // Create a part and a job
    const partId = new ObjectId('222222222222222222222222');
    const partDoc = {
      _id: partId,
      customerId: '111111111111111111111111',
      partNumber: 'PN-004',
      partDescription: 'dummy',
      partRev: 'A',
    };
    await CLIENT.db().collection('customerParts').insertOne(partDoc);

    // create a planning released job
    const jobDoc = {
      orderNumber: 'ABC1001',
      partId: partId,
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [
        '111111111111111111111111',
        '222222222222222222222222',
      ],
      lots: ['111111111111111111111111', '222222222222222222222222'],
      released: true,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

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
    // Create a part and a job
    const partId = new ObjectId('222222222222222222222222');
    const partDoc = {
      _id: partId,
      customerId: '111111111111111111111111',
      partNumber: 'PN-004',
      partDescription: 'dummy',
      partRev: 'A',
    };
    await CLIENT.db().collection('customerParts').insertOne(partDoc);

    // create a planning released job
    const jobDoc = {
      orderNumber: 'ABC1001',
      partId: partId,
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [
        '111111111111111111111111',
        '222222222222222222222222',
      ],
      lots: ['111111111111111111111111', '222222222222222222222222'],
      released: true,
      onHold: true,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

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
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    // create job using mongodb driver
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
      canceled: true,
      stdLotSize: 0,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

    // hit endpoint to get update lot size
    await ChaiRequest('post', `${URL}/lotSize`, {
      jobId,
      lotSize: 12,
    });

    const actual = await CLIENT.db().collection('jobs').findOne({ _id: id });

    // check data
    expect(actual!.stdLotSize).to.be.eq(12);

    // drop collection to maintain stateless tests
    await CLIENT.db().collection('jobs').drop();
  });

  it('lot size needs to be included.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    // create job using mongodb driver
    const doc = {
      _id: id,
      partId: 'partId',
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
      canceled: true,
      stdLotSize: 0,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

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
      await CLIENT.db().collection('jobs').drop();
    }
  });

  it('lot size cannot be edited for released job.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    // create job using mongodb driver
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
      canceled: true,
      stdLotSize: 0,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

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
      await CLIENT.db().collection('jobs').drop();
    }
  });

  it('lot size must be greater than 0.', async () => {
    const jobId = '111111111111111111111111';
    const id = new ObjectId(jobId);
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    // create job using mongodb driver
    const doc = {
      _id: id,
      partId: 'partId',
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
      canceled: true,
      stdLotSize: 0,
    };
    await CLIENT.db().collection('jobs').insertOne(doc);

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
      await CLIENT.db().collection('jobs').drop();
    }
  });
});
