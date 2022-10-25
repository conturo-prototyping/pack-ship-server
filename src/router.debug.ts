/* eslint-disable no-console */
import express, { Request, Response } from 'express';
import { randomInt } from 'crypto';
import { CustomerPartModel, ICustomerPart } from './customerPart/model';
import { JobModel, IJob } from './job/model';
import { LotModel } from './lot/model';
import { RouteStepModel } from './routeStep/model';
import { RouteTemplateModel } from './routeTemplate/model';

const Customer = require('./customer/model');

const router = express.Router();
router.post('/reset', resetData);

/**
 * Drop all working collections and
 * Re-populates customers, customerParts, jobs, and lots.
 */
async function resetData(_req: Request, res: Response) {
  console.debug('Resetting data...');

  try {
    const [dropErr] = await DropAllCollections();
    if (dropErr) res.status(500).send(dropErr.message);

    const tags = ['ABC', 'DEF', 'GHI'];

    const customers = await Promise.all(
      tags.map(async (tag) => {
        const newCustomer = new Customer({ tag, title: `${tag} Corp` });
        await newCustomer.save();
        return newCustomer;
      }),
    );

    await createRandomSetupData(customers);

    console.debug('Done resetting data!');
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
}

/**
 * Given an array of customers -- create parts, jobs, and lots for them.
 */
async function createRandomSetupData(customers) {
  let promises: Promise<any>[] = [];

  const allParts: ICustomerPart[] = [];
  // 1) Create random customer parts
  for (const c of customers) {
    for (let i = 0; i < randomInt(10); i++) {
      const newPart = new CustomerPartModel({
        customerId: c._id,
        partNumber: `PN-00${randomInt(1, 9)}`,
        partDescription: 'Dummy part for testing...',
        partRev: [undefined, 'A', 'B', 'C'][randomInt(0, 3)],
      });

      allParts.push(newPart);
      promises.push(newPart.save());
    }
  }
  await Promise.all(promises);
  promises = [];

  // 2) Create random jobs from the parts
  const allJobs: IJob[] = [];
  const tags = ['ABC', 'DEF', 'GHI'];
  for (const p of allParts) {
    for (let i = 0; i < randomInt(3); i++) {
      promises.push(
        (async () => {
          const externals = ['Vendor A', 'Vendor B', 'Vendor C', 'Vendor D'];
          const sliceStart = randomInt(0, externals.length);
          const sliceEnd = randomInt(sliceStart, externals.length + 1);

          const newJob = new JobModel({
            orderNumber: `${tags[randomInt(0, 3)]}100${randomInt(1, 10)}`,
            partId: p,
            released: [true, false][randomInt(0, 2)],
            canceled: [true, false][randomInt(0, 2)],
            dueDate: new Date(Math.random() * Date.now()).toLocaleDateString(),
            batchQty: randomInt(1, 20),
            material: ['Aluminum', 'Titanium', 'Stainless', 'Plastic'][
              randomInt(0, 3)
            ],
            externalPostProcesses: externals.slice(sliceStart, sliceEnd),
          });

          const newLot = new LotModel({
            jobId: newJob._id,
            quantity: newJob.batchQty,
            router: [],
          });

          await newLot.save();
          newJob.lots = [newLot._id];

          await newJob.save();
          allJobs.push(newJob);
        })(),
      );
    }
  }

  await Promise.all(promises);
}

/**
 * Drop all collections.
 */
export async function DropAllCollections() {
  const dropCollection = async (model) => {
    try {
      await model.collection.drop();

      return true;
    } catch (e: any) {
      // collection doesn't exist; ok
      if (e.name === 'MongoServerError' && e.code === 26) {
        return true;
      }
      console.error(e);
      return false;
    }
  };

  const ok = [
    await dropCollection(Customer),
    await dropCollection(CustomerPartModel),
    await dropCollection(JobModel),
    await dropCollection(LotModel),
    await dropCollection(RouteStepModel),
    await dropCollection(RouteTemplateModel),
  ];

  if (ok.some((x) => !x)) return [new Error('Error dropping collections')];

  return [null];
}

export default router;
