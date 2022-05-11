const express = require('express');
const router = express.Router();
const passport = require('passport');

module.exports = router;

// Google OAuth2.0 login route
// managed from google dev console
router.get("/google",

  // @ts-ignore
  passport.authenticate("google", {
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file'
    ],
    accessType: 'offline'
  })
);

// Google OAuth2.0 callback
// managed from google dev console
router.get("/google/callback",
  passport.authenticate("google", {
    failureMessage:   'Error logging in to Google. Please try again later.',
    failureRedirect:  'http://localhost:3001/loginError',
    successRedirect:  'http://localhost:3001/loginSuccess'
  }), (_req, res) => res.sendStatus(200)
);