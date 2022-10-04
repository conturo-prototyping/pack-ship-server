/* eslint-disable no-console */
/* eslint-disable global-require */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import passport from 'passport';
import mongoose from 'mongoose';
import debugRouter from './router.debug';
import { LotRouter } from './lot/controller';

require('dotenv').config();
require('./config.passport')(passport);

const app = express();
export default app;

app.use(cors({
  origin: [
    process.env.CORS_CLIENT_URL!,
  ],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: process.env.SESSION_NAME,
  keys: [process.env.SESSION_SECRET!],
}));

app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV === 'DEBUG') {
  app.use('/debug', debugRouter);
}

// This handles authentication
app.use('/auth', require('./router.auth'));

app.all('*', (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.redirect(`${req.baseUrl}/auth/google`);
});

app.use('/packingSlips', require('./packingSlip/controller').router);
app.use('/workOrders', require('./workOrder/controller'));
app.use('/shipments', require('./shipment/controller'));
app.use('/users', require('./user/controller'));
app.use('/lots', LotRouter );

app.all('*', (_req, res) => res.sendStatus(404));

// -----------------------------------------
// -----------------------------------------
// Initialized server
// -----------------------------------------
// -----------------------------------------

(async () => {
  let { MONGO_DB_URI, PORT } = process.env;
  if (!PORT) PORT = '8000';

  try {
    await mongoose.connect(MONGO_DB_URI!);
  } catch (e) {
    console.error(e);
    process.exit(2);
  }

  app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
})();
