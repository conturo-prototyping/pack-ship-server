/**
 * For now, User only referns to an employee or staff member.
 * They all log in via Google OAuth2.0
 */

import { model, Schema, Document } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';

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

export const UserSchema = new Schema<IUser>({
  google: {
    id: String,
    accessToken: String,
    refreshToken: String,
    email: String,
  },

  UserName: String,
  Groups: String,
  IsActive: Boolean,
});

export const UserModel = model<IUser>(COLLECTIONS.USER, UserSchema);
