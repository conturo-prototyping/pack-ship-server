import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { DropAllCollections } from '../../src/router.debug';
import { ChaiRequest } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/lots';

const DB_URL: string = process.env.MONGO_DB_URI!;

const CLIENT = new MongoClient(DB_URL);

describe('# LOT', () => {
  before(async function () {
    await CLIENT.connect().catch(console.error);
  });
  afterEach(async function () {
    await DropAllCollections();
  });

  it('Should not find a rev and increment to A.', async () => {
    // set up connection to db
    const jobId = new ObjectId('111111111111111111111111');
    const partId = new ObjectId('222222222222222222222222');
    const lotId = new ObjectId('333333333333333333333333');
    const custId = new ObjectId('444444444444444444444444');

    // Create a part
    const partDoc = {
      _id: partId,
      customerId: custId,
      partNumber: 'PN-004',
      partDescription: 'dummy',
      partRev: 'A',
    };
    await CLIENT.db().collection('customerParts').insertOne(partDoc);

    // Create a job that hasnt been released
    const jobDoc = {
      _id: jobId,
      partId: partId,
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [
        '111111111111111111111111',
        '222222222222222222222222',
      ],
      lots: [lotId],
      released: false,
      onHold: false,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

    // Create lot with no rev
    const lotDoc = {
      _id: lotId,
      jobId: jobId,
      quantity: 1,
    };
    await CLIENT.db().collection('lots').insertOne(lotDoc);

    // hit endpoint to scrap
    const res = await ChaiRequest('post', `${URL}/scrap`, {
      lotId: lotId.toString(),
    });

    // check that rev is A
    const actual = await CLIENT.db().collection('lots').findOne({ _id: lotId });
    expect(actual.rev).to.be.eq('A');
  });

  it('Should find a rev, A  and increment to B.', async () => {
    const jobId = new ObjectId('111111111111111111111111');
    const partId = new ObjectId('222222222222222222222222');
    const lotId = new ObjectId('333333333333333333333333');
    const custId = new ObjectId('444444444444444444444444');

    // Create a part
    const partDoc = {
      _id: partId,
      customerId: custId,
      partNumber: 'PN-004',
      partDescription: 'dummy',
      partRev: 'A',
    };
    await CLIENT.db().collection('customerParts').insertOne(partDoc);

    // Create a job that hasnt been released
    const jobDoc = {
      _id: jobId,
      partId: partId,
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [],
      lots: [lotId],
      released: false,
      onHold: false,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

    // Create lot with rev A
    const lotDoc = {
      _id: lotId,
      jobId: jobId,
      quantity: 2,
      rev: 'A',
    };
    await CLIENT.db().collection('lots').insertOne(lotDoc);

    // hit endpoint to scrap
    const res = await ChaiRequest('post', `${URL}/scrap`, {
      lotId: lotId.toString(),
    });

    // check that rev is B
    const actual = await CLIENT.db().collection('lots').findOne({ _id: lotId });
    expect(actual.rev).to.be.eq('B');
  });

  it('Should fail with no lotId provided.', async () => {
    const routes = [`${URL}/scrap`];
    for (const i in routes) {
      try {
        await ChaiRequest('post', routes[i]);
      } catch (err) {
        expect(err.status).to.be.eq(400);
        expect(err.text).to.be.equal('Please provide a lotId');
      }
    }
  });

  it('Should fail to update lot rev, since job is released', async () => {
    const jobId = new ObjectId('111111111111111111111111');
    const partId = new ObjectId('222222222222222222222222');
    const lotId = new ObjectId('333333333333333333333333');
    const custId = new ObjectId('444444444444444444444444');

    // Create a part
    const partDoc = {
      _id: partId,
      customerId: custId,
      partNumber: 'PN-004',
      partDescription: 'dummy',
      partRev: 'A',
    };
    await CLIENT.db().collection('customerParts').insertOne(partDoc);

    // Create a job that has been released
    const jobDoc = {
      _id: jobId,
      partId: partId,
      dueDate: '2022/10/14',
      batchQty: 1,
      material: 'moondust',
      externalPostProcesses: [],
      lots: [lotId],
      released: true,
      onHold: false,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

    // Create lot with rev A
    const lotDoc = {
      _id: lotId,
      jobId: jobId,
      quantity: 2,
      rev: 'A',
    };
    await CLIENT.db().collection('lots').insertOne(lotDoc);

    // attempt scrap to fail
    try {
      await ChaiRequest('post', `${URL}/scrap`, {
        lotId: lotId.toString(),
      });
    } catch (err) {
      expect(err.status).to.be.eq(405);
      expect(err.text).to.be.equal(
        `Job ${jobId.toString()} has already been released. Can't scrap lot.`,
      );
    }
  });
});
