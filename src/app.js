const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const packingSlipsController = require("./packingSlip/controller");
const shipmentsController = require("./shipment/controller");
const workOrdersController = require("./workOrder/controller");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/packingSlips", packingSlipsController);
app.use("/shipments", shipmentsController);
app.use("/workOrders", workOrdersController);

app.post("/reset", resetData);
app.post("/drop", dropData);

/**
 * Drop all collections.
 * Mostly to run unit tests
 */
async function dropData(_req, res) {
  const [err] = await dropAllCollections();
  if (err) res.status(500).send(err.message);
  else res.sendStatus(200);
}

/**
 * Drop all working collections and
 * repopulate WorkOrders collection with new semi-randomized data.
 */
async function resetData(_req, res) {
  const Customer = require("./customer/model");
  const WorkOrder = require("./workOrder/model");
  const { randomInt } = require("crypto");

  console.debug("Resetting collections...");

  const [dropErr] = await dropAllCollections();
  if (dropErr) res.status(500).send(dropErr.message);

  const tags = ["ABC", "DEF", "GHI"];

  const customers = await Promise.all(
    tags.map(async (customerTag) => {
      const newCustomer = new Customer({ customerTag });
      await newCustomer.save();
      return newCustomer;
    })
  );

  const promises = [];

  for (const c of customers) {
    // work order pool
    for (let i = 0; i < 50; i++) {
      const newWorkOrder = new WorkOrder({
        customer: c._id,
        orderNumber: `${c.customerTag}${1001 + i}`,
        batch: randomInt(1, 3),
        partNumber: `PN-00${randomInt(1, 9)}`,
        partDescription: "Dummy part for testing",
        partRev: ["A", "B", "C"][randomInt(0, 2)],
        quantity: randomInt(1, 50),
      });

      promises.push(newWorkOrder.save());
      if (i == 0) {
        const newWorkOrder = new WorkOrder({
          customer: c._id,
          orderNumber: `${c.customerTag}${1001 + i}`,
          batch: randomInt(1, 3),
          partNumber: `PN-00${randomInt(1, 9)}`,
          partDescription: "Dummy part for testing",
          partRev: ["A", "B", "C"][randomInt(0, 2)],
          quantity: randomInt(1, 50),
        });

        promises.push(newWorkOrder.save());
      }
    }
  }

  await Promise.all(promises);

  console.debug("Collections reset!");
  res.sendStatus(200);
}

/**
 * Drop all collections.
 */
async function dropAllCollections() {
  const WorkOrder = require("./workOrder/model");
  const Shipment = require("./shipment/model");
  const PackingSlip = require("./packingSlip/model");
  const Customer = require("./customer/model");

  const _dropCollection = async (model) => {
    try {
      await model.collection.drop();
      return true;
    } catch (e) {
      // collection doesn't exist; ok
      if (e.name === "MongoServerError" && e.code === 26) {
        return true;
      } else {
        console.error(e);
        return false;
      }
    }
  };

  const ok = [
    await _dropCollection(WorkOrder),
    await _dropCollection(PackingSlip),
    await _dropCollection(Shipment),
    await _dropCollection(Customer),
  ];

  if (ok.some((x) => !x)) return [new Error("Error dropping collections")];

  return [null];
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
