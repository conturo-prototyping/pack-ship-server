import { model, Schema } from 'mongoose';
import { COLLECTIONS } from '../global.collectionNames';
import { IUser } from '../global.interfaces';

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
