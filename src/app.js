const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const passport = require('passport');
const cookieSession = require('cookie-session');

require("dotenv").config();
require('./config.passport')(passport);

const app = express();

app.use(cors({
  origin: [
    process.env.CORS_CLIENT_URL,
  ],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use( cookieSession({
  name: process.env.SESSION_NAME,
  keys: [ process.env.SESSION_SECRET ]
}));
app.use(passport.initialize());
app.use(passport.session());

// This handles authentication
app.use('/auth', require('./auth.router'));
app.all("*", function(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect(req.baseUrl + "/auth/google");
});

app.use("/packingSlips",  require("./packingSlip/controller") );
app.use("/workOrders",    require("./workOrder/controller") );
app.use("/shipments",     require("./shipment/controller") );

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
