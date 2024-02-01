// models/employees/User.js
// document Schema for every user that logs in via Google OAuth2

const { Schema, model } = require('mongoose');

const schema = new Schema({
  google: {
    // OAuth 2.0 properties
    id: String,
    accessToken: String,
    refreshToken: String,
    email: String
  },

  airTable: {
    access_token: String,
    refresh_token: String,
    expiresAt: Number,   // used to avoid hitting AT to check that token is not expired
    refreshExpiresAt: Number, // used to generate new auth & refresh tokens if needed
  },

  UserName: { type: String, required: true },

  // String representing what groups the user belongs to
  // e.g. HR_Manager|Shop_Manager
  Groups: { type: String, default: "GENERIC" },

  // indicate if user is active
  // (inactive users shouldn't be shown in user lists)
  IsActive: { type: Boolean, default: true },

});

module.exports = model('user', schema);