const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const cookieSession = require("cookie-session");
const { CheckUserId } = require('./user/controller');

require("dotenv").config();
require("./config.passport")(passport);

const app = express();

app.use(
  cors({
    origin: [process.env.CORS_CLIENT_URL, process.env.SHOPQ_URL],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: process.env.SESSION_NAME,
    keys: [process.env.SESSION_SECRET],
  })
);
app.use(passport.initialize());
app.use(passport.session());


if (process.env.NODE_ENV === "DEBUG") {
  console.debug("DEBUGGING ROUTES ARE ON !!!");

  app.use("/debug", require("./router.debug"));
}

// This handles authentication
app.use("/auth", require("./router.auth"));

app.all("*", async function (req, res, next) {
  
  // requests from Workflow app should have authUserId value
  const { authUserId } = req.body;

  if (req.isAuthenticated()) return next();
  else if ( authUserId ) {
    // check if userId is valid
    const [ userCheckErr, isUserValid] = await CheckUserId(authUserId );

    if ( userCheckErr ) return res.status(400).send(userCheckErr);   
    if ( !isUserValid ) return res.status(404).send('Invalid User Id. Cannont process request');

    ( req.locals ) 
      ? req.locals.authUserId = authUserId
      : req.locals = { authUserId };

    return next();
  }
  else return res.redirect(req.baseUrl + "/auth/google");   
});

app.use("/shipments", require("./shipment/controller"));

app.use("/packingSlips", require("./packingSlip/controller").router);

app.use("/incomingDeliveries", require("./incomingDelivery/controller").router);
app.use("/workOrders", require("./workOrder/controller").router);
app.use("/users", require("./user/controller").router);

app.use("/storage", require("./cloudStorage/controller").router);

app.all("*", (_req, res) => res.sendStatus(404));

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
      useCreateIndex: true,
      useFindAndModify: false,
    });
  } catch (e) {
    console.error(e);
    process.exit(2);
  }

  app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();

module.exports = app;
