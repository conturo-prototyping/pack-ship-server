const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const cookieSession = require("cookie-session");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();
require("./config.passport")(passport);
require("./jwt/controller.authjwt")(passport);

const app = express();

const cookieSesh = cookieSession({
  name: process.env.SESSION_NAME,
  keys: [process.env.SESSION_SECRET],
});

const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

app.use(
  cors({
    origin: [process.env.CORS_CLIENT_URL],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieSesh);
app.use(passport.initialize());
app.use(passport.session());

const server = http.createServer(app);
const io = new Server(server, {
  cookie: true,
  cors: {
    credentials: true,
    origin: process.env.CORS_CLIENT_URL,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    exposedHeaders: ["Cookie", "Authorization"],
  },
});

io.use(wrap(cookieSesh));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
  if (socket.request.user) {
    next();
  } else if (socket.request.headers["authorization"]) {
    passport.authenticate("jwt", (err, user, _info, _status) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        socket.disconnect(true);
        next(new Error("Unauthorized"));
      }
      socket.request.user = user;
      return next();
    })(socket.request, {}, next);
  } else {
    socket.disconnect(true);
    next(new Error("Unauthorized"));
  }
});

const { joinTemp, uploadDone, deleteUpload } =
  require("./shipmentRouterUpload/controller")(io);

io.sockets.on("connection", (socket) => {
  socket.on("joinTemp", joinTemp);

  socket.on("uploadDone", uploadDone);

  socket.on("deleteUpload", deleteUpload);
});

if (process.env.NODE_ENV === "DEBUG") {
  console.debug("DEBUGGING ROUTES ARE ON !!!");

  app.use("/debug", require("./router.debug"));
}

// This handles authentication
app.use("/auth", require("./router.auth"));
app.all("*", function (req, res, next) {
  if (req.isAuthenticated()) return next();
  else if (req.headers["authorization"]) {
    passport.authenticate("jwt", (err, user, _info, _status) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.send(401);
      }
      req.user = user;
      return next();
    })(req, res, next);
  } else res.redirect(req.baseUrl + "/auth/google");
});

app.use("/shipments", require("./shipment/controller"));
app.use("/packingSlips", require("./packingSlip/controller").router);
app.use("/incomingDeliveries", require("./incomingDelivery/controller").router);
app.use("/workOrders", require("./workOrder/controller").router);
app.use("/users", require("./user/controller").router);
app.use("/qrCode", require("./qrCode/controller").router);
app.use("/tempShipments", require("./tempShipment/controller"));
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

  server.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();

module.exports = app;
