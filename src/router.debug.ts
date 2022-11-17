/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import express, { Request, Response } from 'express';
import { randomInt } from 'crypto';
import { CustomerPartModel, ICustomerPart } from './customerPart/model';
import { IJob, JobModel } from './job/model';
import { LotModel } from './lot/model';
import { RouteStepModel } from './routeStep/model';
import { RouteTemplateModel } from './routeTemplate/model';
import { IRouter, RouterModel } from './router/model';

const Customer = require('./customer/model');

const router = express.Router();
router.post('/reset', resetData);

router.post('/routers/reset', resetRouters);
router.post('/routers/random', randomizeRouters);

/**
 * Delete all router data (Routers, RouteSteps, remove references to jobs / lots)
 */
async function resetRouters(_req: Request, res: Response) {
  res.sendStatus(501);
}

/**
 * Create semi-random routers for testing purposes.
 * Create RouteSteps, Routers, add some references to jobs & lots.
 */
async function randomizeRouters(_req: Request, res: Response) {
  try {
    const existingJobs = await JobModel.find();
    const existingLots = await LotModel.find();

    if (!existingJobs.length)
      return res
        .status(404)
        .send('No jobs found -- use /reset to create random job data');
    if (!existingLots.length)
      return res
        .status(404)
        .send('No lots found -- use /reset to create lot data.');

    // Create the basic route steps
    const defaultRouteSteps = [
      { category: 'Material', name: 'Prep Material' },
      { category: 'Machining', name: 'Machine Lot' },
      { category: 'Inspection', name: 'Visual Inspection' },
      { category: 'Inspection', name: 'First Article Inspection' },
      { category: 'Shipping', name: 'Ship To Vendor' },
      { category: 'Shipping', name: 'Ship To Customer' },
    ];
    await RouteStepModel.insertMany(defaultRouteSteps);

    // Create some randomized routers (10 should be enough)
    const createdRouters: IRouter[] = [];

    for (let i = 0; i < 10; i++) {
      const path: any[] = [];
      for (let j = 0; j < randomInt(5); j++) {
        const newStep = {
          step: {
            ...defaultRouteSteps[randomInt(0, defaultRouteSteps.length)],
          },
        };

        path.push(newStep);
      }

      const newRouter = new RouterModel({
        path,
      });

      await newRouter.save();
      createdRouters.push(newRouter);
    }

    // randomly pick jobs / lots & assign routers
    for (const j of existingJobs.filter(() => Math.random() > 0.5)) {
      j.router = createdRouters[randomInt(0, createdRouters.length)]._id;
      await j.save();
    }
    for (const l of existingLots.filter(() => Math.random() > 0.5)) {
      l.specialRouter = createdRouters[randomInt(0, createdRouters.length)]._id;
      await l.save();
    }

    return res.sendStatus(200);
  } catch (e) {
    return res.status(500).send(e);
  }
}

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
    await dropCollection(RouterModel),
  ];

  if (ok.some((x) => !x)) return [new Error('Error dropping collections')];

  return [null];
}

export default router;
