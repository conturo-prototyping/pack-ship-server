const express = require('express');
const router = express.Router();

module.exports = router;

router.post('/reset', resetData);
router.post('/drop', dropData);

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