import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient } from 'mongodb';
import { ChaiRequest } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/jobs';

const DB_URL: string = process.env.MONGO_DB_URI!;

const CLIENT = new MongoClient(DB_URL);

describe('# JOB', () => {
  it('Should find 1 inserted job.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

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

    // drop collection to maintain stateless tests
    await CLIENT.db().collection('jobs').drop();
  });

  it('Should find 1 released planning job.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

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

    // drop collection to maintain stateless tests
    await CLIENT.db().collection('jobs').drop();
  });

  it('Should find 0 released planning job.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

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

    // drop collection to maintain stateless tests
    await CLIENT.db().collection('jobs').drop();
  });
});
