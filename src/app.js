const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const passport = require('passport');
const cookieSession = require('cookie-session');

const packingSlipsController = require("./packingSlip/controller");
const shipmentsController = require("./shipment/controller");
const workOrdersController = require("./workOrder/controller");
const User = require('./user/model');

require("dotenv").config();
require('./config.passport')(passport);

const app = express();


app.use
app.use(cors({
  origin: [
    'http://localhost',
  ],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use( cookieSession({
  name: 'CPsession',
  keys: [ process.env.SESSION_SECRET ]
}));
app.use(passport.initialize());
app.use(passport.session());

// -------------------------------------
// SETUP GOOGLE AUTH2.0 session blocking
// -------------------------------------

app.all('*', (req, res, next) => {
  console.log(req.method, req.url);
  next();
});

// Google OAuth2.0 login route
// managed from google dev console
app.get("/auth/google",

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
app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureMessage:   'Error logging in to Google. Please try again later.',
    failureRedirect:  'http://localhost:3001/loginError',
    successRedirect:  'http://localhost:3001/loginSuccess'
  }), (_req, res) => res.sendStatus(200)
);

app.all("*", function(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect(req.baseUrl + "/auth/google");
});

app.get('/users/me', async (req, res) => {
  const user = await User.findOne(req.user._id);
  res.send({ user });
})

// -------------------------------------
// -------------------------------------
// -------------------------------------

app.use("/packingSlips", packingSlipsController);
app.use("/shipments", shipmentsController);
app.use("/workOrders", workOrdersController);

if( process.env.NODE_ENV === 'DEBUG' ) {
  app.use('/debugging', require('./debugging'));
}

// -----------------------------------------
// -----------------------------------------
// Initialized server
// -----------------------------------------
// -----------------------------------------

(async () => {
  let { MONGO_DB_URI, PORT } = process.env;
  if (!PORT) PORT = 3000;

  try {
    await mongoose.connect(MONGO_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (e) {
    console.error(e);
    process.exit(2);
  }

  app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();

module.exports = app;
