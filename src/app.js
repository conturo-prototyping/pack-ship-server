const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const cookieSession = require("cookie-session");

require("dotenv").config();
require("./config.passport")(passport);

const app = express();

app.use(
  cors({
    // OLD CODE
    // origin: [process.env.CORS_CLIENT_URL],
    origin: [process.env.CORS_CLIENT_URL, 'http://localhost:8000'],
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


app.options('*', cors()) // enable pre-flight - dont think this does anything mm

// ----------------------------------
// expire in 1 hour
// mm - dont think this does anything
const SESSION_MAX_AGE = 3*60*60*1000;

app.use((req, res, next) => {
  const now = Date.now();
  req.session.now = now;
  res.cookie('CPsession-expiry', '' + (now + SESSION_MAX_AGE), { httpOnly: false, maxAge: SESSION_MAX_AGE });
  next();
});
// ----------------------------------

if (process.env.NODE_ENV === "DEBUG") {
  console.debug("DEBUGGING ROUTES ARE ON !!!");

  app.use("/debug", require("./router.debug"));
}

app.use("/packingSlips", require("./packingSlip/controller").router);

// This handles authentication
app.use("/auth", require("./router.auth"));

// OLD CODE
// app.all("*", function (req, res, next) {
//   if (req.isAuthenticated()) return next();
//   else res.redirect(req.baseUrl + "/auth/google");
// });

app.all("*", function (req, res, next) {
  console.log(req.body, req.data, req.params)
  // console.log(Object.keys(req))
  console.log(req.query)
  console.log(req.method)
  console.log(req.originalUrl)
  console.log(req.user)
  console.log(res.user)
  console.log(req.cookies)
  console.log(req.baseUrl)
  // req.user = {
  //   userName: 'mitch'
  // }

  console.log( req.query.bypass === '1234')
  req.headers['Access-Control-Allow-Origin'] = 'http://localhost:8000';
  req.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, PATCH, DELETE';
  req.headers['Access-Control-Allow-Headers'] = 'X-Requested-With,content-type';
  req.headers['Access-Control-Allow-Credentials'] = true;

  // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8000');
  // res.setHeader('Access-Control-Allow-Origin', 'https://accounts.google.com');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);

  // return next();
  console.log('----------------- auth pre function --------------------------');
  if (req.isAuthenticated()) {
    console.log('----------------- is authed --------------------------');
    // console.log(req.baseUrl)
    return next();
  }
  else {
    // if ( req.query.bypass === '1234' ) return next();
    // if ( req.query.bypass === '1234' ) res.send('/auth/google');

    console.log('----------------- else - nobypass --------------------------');
    // req.headers['Access-Control-Allow-Origin'] = 'http://localhost:8000'
    // req.headers.append('Access-Control-Allow-Origin', '*')
    console.log(req.headers)

    // res.redirect('http://localhost:8000/portals/employee/shop/orders/')
    // res.redirect(req.baseUrl + "/auth/google");    
    // res.redirect('http://localhost:8000/portals/employee' + '/auth/google')
    res.redirect('https://www.brokenbolt.com/images/starrett-inch-metric-tap-drill.pdf')
    // res.send('some shit')
    // res.redirect('http://localhost:8000/portals/employee/auth/google')
  }
});

app.use("/shipments", require("./shipment/controller"));

// OLD CODE
// app.use("/packingSlips", require("./packingSlip/controller").router);

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
