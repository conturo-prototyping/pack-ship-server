import { Document, Types } from 'mongoose';
export interface IQueue extends Document {
  // The name of this queue; e.g. "Planning"
  name: string;

  // Description of this queue
  description: string;

  // Jobs currently in this queue
  itemsInQueue: Types.ObjectId[];
}
