import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { LotModel } from '../../src/lot/model';
import { DropAllCollections } from '../../src/router.debug';
import { RouterModel } from '../../src/router/model';
import { RouteStepModel } from '../../src/routeStep/model';
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

  it('Should update stepDetails of specialRouter found via lotId and stepId', async () => {
    const jobId = new ObjectId('111111111111111111111111');
    const routerStep1Id = new ObjectId('222222222222222222222222');
    const routerStep2Id = new ObjectId('333333333333333333333333');
    const lotId = new ObjectId('444444444444444444444444');

    // Create a routerStep
    const routerStep1Doc = {
      _id: routerStep1Id,
      name: 'routerName',
      category: 'routerCat',
    };
    await CLIENT.db()
      .collection(RouteStepModel.collection.name)
      .insertOne(routerStep1Doc);

    const routerStep2Doc = {
      _id: routerStep2Id,
      name: 'routerName',
      category: 'routerCat',
    };
    await CLIENT.db()
      .collection(RouteStepModel.collection.name)
      .insertOne(routerStep2Doc);

    // Create lot
    const lotDoc = {
      _id: lotId,
      jobId: jobId,
      quantity: 1,
      specialRouter: [
        { step: routerStep1Doc, stepCode: 100, stepDetails: 'step 1 Details' },
        { step: routerStep2Doc, stepCode: 200, stepDetails: 'step 2 Details' },
      ],
    };
    await CLIENT.db().collection(LotModel.collection.name).insertOne(lotDoc);

    // hit endpoint to patch step
    const res = await ChaiRequest('patch', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: routerStep1Id.toString(),
      stepDetails: 'step 1 details modified',
    });

    // check that step 1details are modified and step 2 is untouched
    const actual = await CLIENT.db()
      .collection(LotModel.collection.name)
      .findOne({ _id: lotId });
    expect(actual.specialRouter[0].stepDetails).to.be.eq(
      'step 1 details modified',
    );
    expect(actual.specialRouter[1].stepDetails).to.be.eq('step 2 Details');
  });

  it('Ensure 400 is raised when no lotId provided', async () => {
    try {
      await ChaiRequest('patch', `${URL}/step`);
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Please provide a lotId');
    }
  });

  it('Ensure 404 is raised when lotId provided but doesnt exist', async () => {
    try {
      await ChaiRequest('patch', `${URL}/step`, { lotId: 'fake_id' });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(`Lot fake_id not found`);
    }
  });

  it('Ensure 400 is raised when no stepId is provided', async () => {
    try {
      const jobId = new ObjectId('111111111111111111111111');
      const lotId = new ObjectId('444444444444444444444444');
      // Create lot
      const lotDoc = {
        _id: lotId,
        jobId: jobId,
        quantity: 1,
      };

      await CLIENT.db().collection(LotModel.collection.name).insertOne(lotDoc);
      await ChaiRequest('patch', `${URL}/step`, { lotId: lotId.toString() });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal('Please provide a stepId');
    }
  });

  it('Ensure 404 is raised when stepId is provided but doesnt exist', async () => {
    try {
      const jobId = new ObjectId('111111111111111111111111');
      const lotId = new ObjectId('444444444444444444444444');
      // Create lot
      const lotDoc = {
        _id: lotId,
        jobId: jobId,
        quantity: 1,
      };

      await CLIENT.db().collection(LotModel.collection.name).insertOne(lotDoc);
      await ChaiRequest('patch', `${URL}/step`, {
        lotId: lotId.toString(),
        stepId: 'fake_id',
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal('Router Step fake_id not found');
    }
  });

  it('Ensure 404 is raised when stepId and lotId both exist, but the stepId is not within the specialRouter', async () => {
    try {
      const jobId = new ObjectId('111111111111111111111111');
      const routerStepId = new ObjectId('222222222222222222222222');
      const lotId = new ObjectId('444444444444444444444444');

      // Create lot
      const lotDoc = {
        _id: lotId,
        jobId: jobId,
        quantity: 1,
        specialRouter: [],
      };
      await CLIENT.db().collection(LotModel.collection.name).insertOne(lotDoc);

      // Create a routerStep
      const routerStep1Doc = {
        _id: routerStepId,
        name: 'routerName',
        category: 'routerCat',
      };
      await CLIENT.db()
        .collection(RouteStepModel.collection.name)
        .insertOne(routerStep1Doc);

      await ChaiRequest('patch', `${URL}/step`, {
        lotId: lotId.toString(),
        stepId: routerStepId.toString(),
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(
        'Router Step 222222222222222222222222 not found in any lot specialRouters',
      );
    }
  });

  it('Ensure 404 is raised when lotId provided but doesnt exist for PUT /step', async () => {
    try {
      await ChaiRequest('patch', `${URL}/step`, { lotId: 'fake_id' });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(`Lot fake_id not found`);
    }
  });

  it('Ensure 404 is raised when stepId is provided but doesnt exist for PUT /step', async () => {
    try {
      const jobId = new ObjectId('111111111111111111111111');
      const lotId = new ObjectId('444444444444444444444444');
      // Create lot
      const lotDoc = {
        _id: lotId,
        jobId: jobId,
        quantity: 1,
        specialRouter: [],
      };

      await CLIENT.db().collection(LotModel.collection.name).insertOne(lotDoc);
      await ChaiRequest('put', `${URL}/step`, {
        lotId: lotId.toString(),
        stepId: 'fake_id',
        insertAfterIndex: 0,
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal('Router Step fake_id not found');
    }
  });

  it("Update Lot's router to have third step", async () => {
    const jobId = new ObjectId('111111111111111111111111');
    const routerStep1Id = new ObjectId('222222222222222222222222');
    const routerStep2Id = new ObjectId('333333333333333333333333');
    const routerStep3Id = new ObjectId('444444444444444444444444');
    const lotId = new ObjectId('555555555555555555555555');

    // Create a routerStep
    const routerStep1Doc = {
      _id: routerStep1Id,
      name: 'routerName',
      category: 'routerCat',
    };
    await CLIENT.db()
      .collection(RouteStepModel.collection.name)
      .insertOne(routerStep1Doc);

    const routerStep2Doc = {
      _id: routerStep2Id,
      name: 'routerName',
      category: 'routerCat',
    };
    await CLIENT.db()
      .collection(RouteStepModel.collection.name)
      .insertOne(routerStep2Doc);

    const routerStep3Doc = {
      _id: routerStep3Id,
      name: 'routerName3',
      category: 'routerCat',
    };
    await CLIENT.db()
      .collection(RouteStepModel.collection.name)
      .insertOne(routerStep3Doc);

    // Create lot
    const lotDoc = {
      _id: lotId,
      jobId: jobId,
      quantity: 1,
      specialRouter: [
        { step: routerStep1Doc, stepCode: 100, stepDetails: 'step 1 Details' },
        { step: routerStep2Doc, stepCode: 200, stepDetails: 'step 2 Details' },
      ],
    };
    await CLIENT.db().collection(LotModel.collection.name).insertOne(lotDoc);

    // hit endpoint to patch step
    const res = await ChaiRequest('put', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: '444444444444444444444444',
      insertAfterIndex: 0,
    });

    // check that step 1details are modified and step 2 is untouched
    const actual = await CLIENT.db()
      .collection(LotModel.collection.name)
      .findOne({ _id: lotId });
    expect(actual.specialRouter[0].stepDetails).to.be.eq('step 1 Details');
    expect(actual.specialRouter[1].step.name).to.be.eq('routerName3');
    expect(actual.specialRouter[1].stepCode).to.be.eq(100);
    expect(actual.specialRouter[1].stepDetails).to.be.eq('');
  });
});
