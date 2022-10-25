import { Document, Schema } from 'mongoose';

/**
 * CustomerPart is the basic building block for all quote line-items.
 * Line items will each have a CustomerPart and a PartCostAnalysis
 */
export interface ICustomerPart extends Document {
  customerId: Schema.Types.ObjectId;
  partNumber: String;
  partDescription: String;
  partRev: String;
}

/**
 * Jobs are each of the line-items that will appear in a order (i.e. a bid that has been won).
 * Being that each Job is comprised of at least one Lot (can be arbitrarily many), the default,
 * router is what each Lot should use in case they do not have an overriding router referenced.
 */
export interface IJob extends Document {

  // The customer part that this job is for
  partId: ICustomerPart['_id'];

  // when is this job due to the customer?
  dueDate: string;

  // quantity ordered of this part
  batchQty: number;

  // material to use to produce this part
  material: string;

  // array of post processes to apply to job
  externalPostProcesses: string[];

  // is this job canceled (i.e. no longer visible)
  canceled: boolean;

  // router to use for this job and all of it's lots (if no override)
  router: IRouter['_id'];

  // the standard lot size
  // this is used to auto-generate lots once determined
  stdLotSize: number;

  // array of lots this job will hold
  lots: ILot['_id'][];
}

/**
 * Job Queues are work queues that deal with an entire job as opposed to processing each lot
 *  individually.
 *
 * This is particularly helpful for stages such as "Planning" or "Shipping", where it is
 *  more useful to process the entire job once all lots are present, rather than lot by lot.
 */
export interface IJobQueue extends Document {
  // The name of this queue; e.g. "Planning"
  name: string;

  // Description of this queue
  description: string;

  // Jobs currently in this queue
  jobsInQueue: IJob['_id'][];
}

/**
 * Lots essentially define a bunch of "parts" that move around a site together.
 * If a
 */
export interface ILot extends Document {
  // Reference to parent Job
  jobId: IJob['_id'];

  // quantity to be produced for this lot
  quantity: Number;

  // Revision of this lot (in case of entire quantity scrap)
  rev: String;

  specialRouter: IRouter['_id'];
}

/**
 * The majority of work queues are lot queues. That is, once a job has been broken into lots,
 *  each station processes its stage of the job by lots.
 *
 * Lots move from queue to queue as determined by their router.
 */
export interface ILotQueue extends Document {
  // The name of this queue; e.g. "Material"
  name: string;

  // Description of this queue
  description: string;

  // Lots currently in this queue
  lotsInQueue: ILot['_id'][];
}

/**
 * Routers define the path a job and its lots (or a specific lot) will take once
 *  a bid has been won.
 */
export interface IRouterElement {
  step: IRouteStep;
  stepCode?: number;
  stepDetails?: string;
}
export interface IRouter extends Document {
  path: IRouterElement[];
}

/**
 * RouteSteps are the basic building blocks for routers.
 * However, when routers are built, we use copies of the route steps,
 * rather than pointers. This is to preserve the encoded intention at the time
 * of creation, in case of future modifications.
 */
export interface IRouteStep extends Document {
  category: string;
  name: string;
}

/**
 * RouteTemplates are a simple way to re-create routers from pre-built templates.
 * Unlike actual routers, RouteTempltes encode live references to RouteSteps.
 * When building a router from a template, we make copies of referenced RouteSteps,
 * just as we would if building it from scratch.
 */
export interface IRouteTemplate extends Document {
  name: string;

  steps: [{
    id: IRouteStep['_id'],
    details: string
  }];
}

/**
 * Sites are the main hierarchical units of ShopQ.
 * Each site has its own staff, work queues (job & lot), timezone, location, and name.
 *
 * A centralized sales module feeds work to each site.
 */
export interface ISite extends Document {
  // The name of the site; e.g. HQ
  name: string;

  // Shipping address of the site; each line is a new string in the array.
  location: string[];

  // The timezone this site should be synched to.
  timezone: string;

  // Array of staff members employed at the site.
  staff: IUser['_id'][];

  // Array of Job Queues.
  jobQueues: IJobQueue['_id'][];

  // Array of Lot Queues.
  lotQueues: ILotQueue['_id'][];
}

/**
 * For now, User only referns to an employee or staff member.
 * They all log in via Google OAuth2.0
 */
export interface IUser extends Document {
  google: {
    id: String,
    accessToken: String,
    refreshToken: String,
    email: String
  };

  UserName: String;
  Groups: String;
  IsActive: Boolean;
}
