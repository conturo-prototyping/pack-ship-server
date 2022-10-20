import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient } from 'mongodb';
import { DropAllCollections } from '../../src/router.debug';
import { ChaiRequest } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/jobs';

// set up DB_URL - NOTE: this only works with a local db, if not set up use the /debug/reset route to generate data (this might not be needed)
const DB_URL: string = process.env.MONGO_DB_URI!;
// FYI for this there is a permission issue of trying to go to a new db, currently I don't have a local db set up

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
});
