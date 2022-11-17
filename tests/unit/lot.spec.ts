import { expect } from 'chai';
import { describe, it } from 'mocha';
import { MongoClient, ObjectId } from 'mongodb';
import { LotModel } from '../../src/lot/model';
import { DropAllCollections } from '../../src/router.debug';
import { RouterModel } from '../../src/router/model';
import { RouteStepModel } from '../../src/routeStep/model';
import { ChaiRequest } from '../config';
import { insertOneJob } from './job.spec';

require('../config'); // recommended way of loading root hooks

const URL = '/lots';

const DB_URL: string = process.env.MONGO_DB_URI!;

const CLIENT = new MongoClient(DB_URL);

describe('# LOT', () => {
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
    expect(actual?.rev).to.be.eq('A');
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
    expect(actual?.rev).to.be.eq('B');
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
    const routerStep1Id = new ObjectId('222222222222222222222222');
    await insertOneRouterStep({
      id: routerStep1Id,
      name: 'nameA',
      category: 'catA',
    });

    const routerStep2Id = new ObjectId('333333333333333333333333');
    await insertOneRouterStep({
      id: routerStep2Id,
      name: 'nameB',
      category: 'catB',
    });

    const jobId = new ObjectId('111111111111111111111111');
    const routerId = new ObjectId('111111111111111111111111');
    const step1: any = {
      step: { _id: routerStep1Id, name: 'nameA', category: 'catA' },
      stepDetails: 'step 1 Details',
    };
    const step2: any = {
      step: { _id: routerStep2Id, name: 'nameB', category: 'catB' },
      stepDetails: 'step 2 Details',
    };
    const path: any = [step1, step2];
    await insertOneRouter({
      id: routerId,
      path,
    });

    const lotId = new ObjectId('555555555555555555555555');
    await insertOneLot({ id: lotId, jobId: jobId, specialRouter: routerId });

    const res = await ChaiRequest('patch', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: routerStep1Id.toString(),
      stepDetails: 'step 1 details modified',
    });

    // check that step 1details are modified and step 2 is untouched
    const actual = await CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerId });

    expect(actual?.path[0].stepDetails).to.be.eq('step 1 details modified');
    expect(actual?.path[1].stepDetails).to.be.eq('step 2 Details');
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
    const routerStep1Id = new ObjectId('222222222222222222222222');
    const lotId = new ObjectId('555555555555555555555555');
    try {
      await insertOneRouterStep({
        id: routerStep1Id,
        name: 'nameA',
        category: 'catA',
      });

      const routerId = new ObjectId('111111111111111111111111');
      await insertOneRouter({
        id: routerId,
        path: [],
      });

      const jobId = new ObjectId('111111111111111111111111');
      await insertOneLot({ id: lotId, jobId: jobId, specialRouter: routerId });

      await ChaiRequest('patch', `${URL}/step`, {
        lotId: lotId.toString(),
        stepId: routerStep1Id.toString(),
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(
        `Router Step ${routerStep1Id.toString()} not found in any lot specialRouters with lot id ${lotId.toString()}`,
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

  it("Update Lot's router to add consecutive steps of path for unreleased job", async () => {
    await insertOneRouterStep({
      id: new ObjectId('111111111111111111111111'),
      name: 'nameA',
      category: 'catA',
    });

    await insertOneRouterStep({
      id: new ObjectId('222222222222222222222222'),
      name: 'nameB',
      category: 'catB',
    });

    await insertOneRouterStep({
      id: new ObjectId('333333333333333333333333'),
      name: 'nameC',
      category: 'catC',
    });

    const jobId = new ObjectId('111111111111111111111111');
    // @ts-ignore
    await insertOneJob({ id: jobId, released: false });

    const routerId = new ObjectId('111111111111111111111111');
    await insertOneRouter({ id: routerId, path: [] });

    const lotId = new ObjectId('555555555555555555555555');
    await insertOneLot({ id: lotId, jobId: jobId, specialRouter: routerId });

    // hit endpoint to put step
    await ChaiRequest('put', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: '111111111111111111111111',
      insertAfterIndex: 0,
    });
    const a = await CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerId });
    expect(a?.path[0].step.category).to.be.eq('catA');
    expect(a?.path[0].step.name).to.be.eq('nameA');
    expect(a?.path[0]?.stepCode).to.be.undefined;

    // hit endpoint again to add a second after index 0
    await ChaiRequest('put', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: '222222222222222222222222',
      insertAfterIndex: 0,
    });
    const b = await CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerId });
    expect(b?.path[0].step.category).to.be.eq('catA');
    expect(b?.path[0].step.name).to.be.eq('nameA');
    expect(b?.path[0]?.stepCode).to.be.undefined;
    expect(b?.path[1].step.category).to.be.eq('catB');
    expect(b?.path[1].step.name).to.be.eq('nameB');
    expect(b?.path[1]?.stepCode).to.be.undefined;

    // hit endpoint again to add inbetween 0 and 1
    await ChaiRequest('put', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: '333333333333333333333333',
      insertAfterIndex: 0,
    });

    // check that the router has the step added
    const c = await CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerId });
    expect(c?.path[0].step.category).to.be.eq('catA');
    expect(c?.path[0].step.name).to.be.eq('nameA');
    expect(c?.path[0]?.stepCode).to.be.undefined;
    expect(c?.path[1].step.category).to.be.eq('catC');
    expect(c?.path[1].step.name).to.be.eq('nameC');
    expect(c?.path[1]?.stepCode).to.be.undefined;
    expect(c?.path[2].step.category).to.be.eq('catB');
    expect(c?.path[2].step.name).to.be.eq('nameB');
    expect(c?.path[2]?.stepCode).to.be.undefined;
  });

  it("Update Lot's router to add consecutive steps of path for released job", async () => {
    await insertOneRouterStep({
      id: new ObjectId('111111111111111111111111'),
      name: 'nameA',
      category: 'catA',
    });

    await insertOneRouterStep({
      id: new ObjectId('222222222222222222222222'),
      name: 'nameB',
      category: 'catB',
    });

    await insertOneRouterStep({
      id: new ObjectId('333333333333333333333333'),
      name: 'nameC',
      category: 'catC',
    });

    const jobId = new ObjectId('111111111111111111111111');
    // @ts-ignore
    await insertOneJob({ id: jobId, released: true });

    const routerId = new ObjectId('111111111111111111111111');
    await insertOneRouter({ id: routerId, path: [] });

    const lotId = new ObjectId('555555555555555555555555');
    await insertOneLot({ id: lotId, jobId: jobId, specialRouter: routerId });

    // hit endpoint to put step
    await ChaiRequest('put', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: '111111111111111111111111',
      insertAfterIndex: 0,
    });
    const a = await CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerId });
    expect(a?.path[0].step.category).to.be.eq('catA');
    expect(a?.path[0].step.name).to.be.eq('nameA');
    expect(a?.path[0]?.stepCode).to.be.eq(100);

    // hit endpoint again to add a second after index 0
    await ChaiRequest('put', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: '222222222222222222222222',
      insertAfterIndex: 0,
    });
    const b = await CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerId });
    expect(b?.path[0].step.category).to.be.eq('catA');
    expect(b?.path[0].step.name).to.be.eq('nameA');
    expect(b?.path[0]?.stepCode).to.be.eq(100);
    expect(b?.path[1].step.category).to.be.eq('catB');
    expect(b?.path[1].step.name).to.be.eq('nameB');
    expect(b?.path[1]?.stepCode).to.be.eq(200);

    // hit endpoint again to add inbetween 0 and 1
    await ChaiRequest('put', `${URL}/step`, {
      lotId: lotId.toString(),
      stepId: '333333333333333333333333',
      insertAfterIndex: 0,
    });

    // check that the router has the step added
    const c = await CLIENT.db()
      .collection(RouterModel.collection.name)
      .findOne({ _id: routerId });
    expect(c?.path[0].step.category).to.be.eq('catA');
    expect(c?.path[0].step.name).to.be.eq('nameA');
    expect(c?.path[0]?.stepCode).to.be.eq(100);
    expect(c?.path[1].step.category).to.be.eq('catC');
    expect(c?.path[1].step.name).to.be.eq('nameC');
    expect(c?.path[1]?.stepCode).to.be.eq(150);
    expect(c?.path[2].step.category).to.be.eq('catB');
    expect(c?.path[2].step.name).to.be.eq('nameB');
    expect(c?.path[2]?.stepCode).to.be.eq(200);
  });

  it('Ensure 400 is raised when lotId is not provided for put /lots/step', async () => {
    try {
      await ChaiRequest('put', `${URL}/step`, {});
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal(`Please provide a lotId`);
    }
  });

  it('Ensure 404 is raised when lotId is provided but doesnt exist for put /lots/step', async () => {
    try {
      await ChaiRequest('put', `${URL}/step`, { lotId: 'fake_id' });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(`Lot fake_id not found`);
    }
  });

  it('Ensure 400 is raised when stepId is not provided for put /lots/step', async () => {
    try {
      const routerId = new ObjectId('111111111111111111111111');
      const jobId = new ObjectId('111111111111111111111111');
      const lotId = new ObjectId('555555555555555555555555');
      await insertOneLot({ id: lotId, jobId: jobId, specialRouter: routerId });
      await ChaiRequest('put', `${URL}/step`, { lotId: lotId.toString() });
    } catch (err) {
      expect(err.status).to.be.eq(400);
      expect(err.text).to.be.equal(`Please provide a stepId`);
    }
  });

  it('Ensure 404 is raised when stepId is provided but doesnt exist for put /lots/step', async () => {
    const routerId = new ObjectId('111111111111111111111111');
    const jobId = new ObjectId('111111111111111111111111');
    const lotId = new ObjectId('555555555555555555555555');
    await insertOneLot({ id: lotId, jobId: jobId, specialRouter: routerId });
    try {
      await ChaiRequest('put', `${URL}/step`, {
        lotId: lotId.toString(),
        stepId: 'fake_id',
      });
    } catch (err) {
      expect(err.status).to.be.eq(404);
      expect(err.text).to.be.equal(`Router Step fake_id not found`);
    }
  });
});

async function insertOneLot({ id, jobId, specialRouter, quantity = 1 }) {
  const routerStepDoc = {
    _id: id,
    jobId,
    specialRouter,
    quantity,
  };
  await CLIENT.db()
    .collection(LotModel.collection.name)
    .insertOne(routerStepDoc);
}

async function insertOneRouterStep({
  id,
  name = 'routerName',
  category = 'routerCat',
}) {
  const routerStepDoc = {
    _id: id,
    name,
    category,
  };
  await CLIENT.db()
    .collection(RouteStepModel.collection.name)
    .insertOne(routerStepDoc);
}

async function insertOneRouter({ id, path = [] }) {
  const routerDoc = {
    _id: id,
    path,
  };
  await CLIENT.db()
    .collection(RouterModel.collection.name)
    .insertOne(routerDoc);
}
