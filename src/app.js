const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const passport = require('passport');
const cookieSession = require('cookie-session');

const packingSlipsController = require("./packingSlip/controller");
const shipmentsController = require("./shipment/controller");
const workOrdersController = require("./workOrder/controller");

require("dotenv").config();
require('./config.passport')(passport);

const app = express();


app.use
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use( cookieSession({
  name: 'CPsession',
  keys: [ process.env.SESSION_SECRET ]
}));
app.use(passport.initialize());
app.use(passport.session());


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
