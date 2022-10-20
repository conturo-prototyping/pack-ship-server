import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { ChaiRequest } from '../config';

require('../config'); // recommended way of loading root hooks

const URL = '/lots';

const DB_URL: string = process.env.MONGO_DB_URI!;

const CLIENT = new MongoClient(DB_URL);

describe('# LOT', () => {
  it('Should not find a rev and increment to A.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    // Create a job that hasnt been released
    const jobId = new ObjectId('111111111111111111111111');
    const jobDoc = {
      _id: jobId,
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
      onHold: false,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

    // create lots using mongodb driver
    const lotId = new ObjectId('333333333333333333333333');
    const doc = {
      _id: lotId,
      jobId: jobId,
      quantity: 1,
    };
    await CLIENT.db().collection('lots').insertOne(doc);

    // hit endpoint to get see if rev is A
    const res = await ChaiRequest('post', `${URL}/scrap`, {
      lotId: lotId.toString(),
    });

    // check that rev is A
    const actual = await CLIENT.db().collection('lots').findOne({ _id: lotId });
    expect(actual.rev).to.be.eq('A');

    await CLIENT.db().collection('lots').drop();
  });

  it('Should find a rev, A  and increment to B.', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    // Create a job that hasnt been released
    const jobId = new ObjectId('211111111111111111111111');
    const jobDoc = {
      _id: jobId,
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
      onHold: false,
      canceled: false,
      stdLotSize: 1,
    };
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

    // create lots using mongodb driver
    const lotId = new ObjectId('333333333333333333333333');
    const doc = {
      _id: lotId,
      jobId: jobId,
      quantity: 1,
      rev: 'A',
    };
    await CLIENT.db().collection('lots').insertOne(doc);

    // hit endpoint to get see if rev is B
    const res = await ChaiRequest('post', `${URL}/scrap`, {
      lotId: lotId.toString(),
    });

    // check that rev is B
    const actual = await CLIENT.db().collection('lots').findOne({ _id: lotId });
    expect(actual.rev).to.be.eq('B');

    await CLIENT.db().collection('lots').drop();
  });

  //   it('Should fail with no lotId provided.', async () => {
  //     // set up connection to db
  //     await CLIENT.connect().catch(console.error);

  //     const routes = [`${URL}/scrap`];
  //     for (const i in routes) {
  //       try {
  //         await ChaiRequest('post', routes[i]);
  //       } catch (err) {
  //         console.log('A', err);
  //         expect(err.status).to.be.eq(400);
  //         expect(err.text).to.be.equal('Please provide a lotId');
  //       }
  //     }
  //   });

  it('Should fail to update lot rev, since job is released', async () => {
    // set up connection to db
    await CLIENT.connect().catch(console.error);

    // Create a job that hasnt been released
    const jobId = new ObjectId('311111111111111111111111');
    const jobDoc = {
      _id: jobId,
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
    await CLIENT.db().collection('jobs').insertOne(jobDoc);

    // create lots using mongodb driver
    const lotId = new ObjectId('333333333333333333333333');
    const doc = {
      _id: lotId,
      jobId: jobId,
      quantity: 1,
      rev: 'A',
    };
    await CLIENT.db().collection('lots').insertOne(doc);

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

    await CLIENT.db().collection('lots').drop();
  });
});
