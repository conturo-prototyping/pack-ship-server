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
  const ShopQueue = require('./shopQ/shopQueue.model');
  const { randomInt } = require("crypto");

  console.debug("Resetting collections...");

  const [dropErr] = await dropAllCollections();
  if (dropErr) res.status(500).send(dropErr.message);

  const tags = ["ABC", "DEF", "GHI"];

  const customers = await Promise.all(
    tags.map(async (tag) => {
      const newCustomer = new Customer({ tag, title: tag+' Corp' });
      await newCustomer.save();
      return newCustomer;
    })
  );

  const promises = [];
  const workOrderIds = [];

  for (const c of customers) {
    // work order pool
    for (let i = 0; i < randomInt(20); i++) {
      const Items = [];

      for (let j = 0; j < randomInt(10); j++) {

        const newItem = {
          OrderNumber:  `${c.tag}${1001 + i}`,
          PartNumber:   `PN-00${randomInt(1, 9)}`,
          PartName:     'Dummy part for testing...',
          Revision:     ['A', 'B', 'C'][randomInt(0,2)],
          Quantity:     randomInt(1, 50),
          partRouter:   [
            {
              step: { category: 'MACHINING', name: 'Machine Lot' },
              stepCode: 100
            },
            {
              step: { category: 'SHIPPING', name: 'Ship To Vendor' },
              stepCode: 200
            },
            {
              step: { category: 'SHIPPING', name: 'Ship To Customer' },
              stepCode: 300
            },
          ],
          released: true
        };

        for (let k = 1; k < randomInt(4); k++) {
          Items.push({
            ...newItem,
            batchNumber: k
          });
        }
      }

      const newWorkOrder = new WorkOrder({
        OrderNumber:  `${c.tag}${1001 + i}`,
        DateDue:      new Date(),
        Items
      });
      workOrderIds.push(newWorkOrder._id);

      promises.push( newWorkOrder.save() );
    }
  }

  await Promise.all(promises);

  const sq = new ShopQueue({
    Items: workOrderIds
  });
  await sq.save();

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
  const ShopQueue = require('./shopQ/shopQueue.model');

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
    await _dropCollection(ShopQueue),
  ];

  if (ok.some((x) => !x)) return [new Error("Error dropping collections")];

  return [null];
}