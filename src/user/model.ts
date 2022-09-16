// models/employees/User.js
// document Schema for every user that logs in via Google OAuth2

import { Document, model, Schema } from 'mongoose';

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

export const UserModel = model<IUser>('user', UserSchema);
