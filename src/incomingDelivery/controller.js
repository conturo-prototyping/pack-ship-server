const { Router } = require("express");
const router = Router();
const { LogError, ExpressHandler, HTTPError } = require("../utils");
const ObjectId = require("mongodb").ObjectId;
const IncomingDelivery = require("./model");
const IncomingDeliveryHistory = require("./model.history");
const PackingSlip = require("../packingSlip/model");
const WorkOrder = require("../workOrder/model");
const Shipment = require("../shipment/model");
const dayjs = require("dayjs");

router.get("/", getAll);
router.put("/", createOne);
router.get("/queue", getQueue);
router.post("/receive", setReceived);

// Make sure the deliveryId is valid
router.post("/undoReceive", (req, res, next) =>
  checkId(res, next, IncomingDelivery, req.body.deliveryId)
);

router.post("/undoReceive", undoReceive);
router.get("/allReceived", getAllReceived);
router.get("/:deliveryId", getOne);

router.patch("/:deliveryId", (req, res, next) =>
  checkId(res, next, IncomingDelivery, req.params.deliveryId)
);
router.patch("/:deliveryId", editOne);

module.exports = {
  router,
  CreateNew,
};

/**
 * Create a new incomingDelivery.model.history document with the contents of the CURRENT incomingDelivery.model
 * THEN delete the matching model doc
 */
function undoReceive(req, res) {
  ExpressHandler(
    async () => {
      const { _id, ...incomingDel } = res.locals.data;
      const { deliveryId } = req.body;
      const editMadeBy = req.user._id;

      try {
        const incDelHist = new IncomingDeliveryHistory({
          editMadeBy,
          ...incomingDel,
        });

        await Promise.all([
          incDelHist.save(),
          IncomingDelivery.deleteOne({ _id: ObjectId(deliveryId) }),
        ]);
      } catch (error) {
        LogError(error);

        return HTTPError(
          `Unexpected error calling undoReceive with ${deliveryId}.`
        );
      }
    },
    res,
    "undo receive"
  );
}

/**
 * Create a new incomingDelivery.model.history document with the contents of the CURRENT incomingDelivery.model
 * THEN commit changes
 */
function editOne(req, res) {
  ExpressHandler(
    async () => {
      const { _id, ...incomingDel } = res.locals.data;
      const edited = req.body;
      const editMadeBy = req.user._id;

      try {
        const incDelHist = new IncomingDeliveryHistory({
          editMadeBy,
          ...incomingDel,
        });

        const updated = {
          ...incomingDel,
          ...edited,
        };
        await Promise.all([
          incDelHist.save(),
          IncomingDelivery.updateOne({ _id: _id }, { $set: updated }),
        ]);
      } catch (error) {
        LogError(error);

        return HTTPError(`Unexpected error calling editOne with ${_id}.`);
      }
    },
    res,
    "editing deliveru"
  );
}

/**
 * Manually create a new incoming delivery.
 * Source Shipment Id should only be used if this is getting automatically hit when creating an outgoing shipment.
 *
 * @param {String} internalPurchaseOrderNumber
 * @param {ObjectId | String} creatingUserId
 * @param {String} isDueBackOn
 * @param {(ObjectId | String)?} sourceShipmentId
 */
async function CreateNew(
  internalPurchaseOrderNumber,
  creatingUserId,
  isDueBackOn,
  sourceShipmentId = undefined
) {
  try {
    if (!sourceShipmentId) return [HTTPError("Shipment ID not sent.", 400)];
    if (!dayjs(isDueBackOn).isValid())
      return [
        HTTPError("Please provide a valid string that represents a date.", 400),
      ];

    const [err, ret] = await getSourceShipmentLabel(sourceShipmentId);
    if (err) return [err];

    const { numberOfDeliveries } = ret;
    let label = ret.label + "-R";
    if (numberOfDeliveries > 0) label += `${numberOfDeliveries + 1}`;

    const deliveryInfo = {
      internalPurchaseOrderNumber,
      createdBy: creatingUserId,
      isDueBackOn,
      sourceShipmentId,
      label,
    };

    const newIncomingDelivery = new IncomingDelivery(deliveryInfo);
    await newIncomingDelivery.save();

    return [, { incomingDelivery: newIncomingDelivery }];
  } catch (error) {
    LogError(error);
    return [HTTPError("Unexpected error creating incoming delivery.")];
  }
}

/**
 * Fetch all incoming deliveries ever created.
 */
function getAll(req, res) {}

/**
 * Create a single incoming delivery.
 * Use this only for manual entries.
 */
function createOne(req, res) {
  ExpressHandler(
    async () => {
      const { internalPurchaseOrderNumber, isDueBackOn, sourceShipmentId } =
        req.body;

      const [err, data] = await CreateNew(
        internalPurchaseOrderNumber,
        req.user._id,
        isDueBackOn,
        sourceShipmentId
      );
      if (err) return err;

      return { data };
    },
    res,
    "creating an incoming delivery"
  );
}

/**
 * Get the queue of incoming deliveries that have not yet been received.
 */
function getQueue(req, res) {
  ExpressHandler(
    async () => {
      const query = {
        receivedOn: {
          $exists: false,
        },
        isPastVersion: { $ne: true },
      };
      const _deliveries = await IncomingDelivery.find(query)
        .lean()
        .populate({
          path: "sourceShipmentId",
          populate: {
            path: "manifest",
            model: "packingSlip",
          },
        })
        .exec();

      const ordersSet = new Set(); //use to track all workOrders that need to be fetched
      const itemsObjs = {};
      const promises = [];

      //map _deliveries into almost final format
      const deliveries = _deliveries.map((x) => {
        const { _id, label, sourceShipmentId } = x;

        const manifestArr = [];
        for (m of sourceShipmentId.manifest) {
          manifestArr.push(...m.items);

          //check if ordersSet has order number already, add if not
          if (ordersSet.has(m.orderNumber) === false) {
            ordersSet.add(m.orderNumber);
            const _populateItems = async (orderNumber) => {
              const workOrder = await WorkOrder.findOne({
                OrderNumber: orderNumber,
              })
                .lean()
                .select("Items")
                .exec();

              for (const woItem of workOrder.Items) {
                const {
                  _id,
                  OrderNumber,
                  PartNumber,
                  PartName,
                  Revision,
                  batchNumber,
                } = woItem;
                const _woItem = {
                  _id,
                  orderNumber: OrderNumber,
                  partNumber: PartNumber,
                  partDescription: PartName,
                  partRev: Revision,
                  batch: batchNumber,
                };
                itemsObjs[woItem._id] = _woItem;
              }
            };
            promises.push(_populateItems(m.orderNumber));
          }
        }

        const _obj = {
          _id,
          label,
          manifest: manifestArr,
          source: m.destination,
        };

        return _obj;
      });

      await Promise.all(promises);

      //loop through deliveries and create mutated ret array
      const ret = deliveries.map((d) => {
        const _manifest = d.manifest.map(({ _id, item, qty }) => {
          return {
            _id,
            item: itemsObjs[item],
            qty,
          };
        });
        d.manifest = _manifest;
        return d;
      });

      const data = {
        incomingDeliveries: ret,
      };
      return { data };
    },
    res,
    "fetching incoming deliveries queue"
  );
}

/**
 *
 */
function setReceived(req, res) {
  ExpressHandler(
    async () => {
      const { _id, receivedQuantities } = req.body;
      const userId = req.user._id;
      const incomingDelivery = await IncomingDelivery.findOne({ _id });

      if (incomingDelivery.receivedOn)
        return HTTPError("delivery already received");

      incomingDelivery.receivedOn = new Date();
      incomingDelivery.receivedBy = userId;
      incomingDelivery.receivedQuantities = receivedQuantities;
      await incomingDelivery.save();

      // Joing to packingSlips collection to find qty per item
      const result = await Shipment.aggregate([
        {
          $lookup: {
            from: PackingSlip.collection.collectionName,
            localField: "manifest",
            foreignField: "_id",
            as: "fromManifest",
          },
        },
        {
          $match: {
            _id: incomingDelivery.sourceShipmentId,
          },
        },
      ]);

      // Compare to receivedQuantities. If the  qty is not fullfilled,
      // make an exact copy
      result.forEach(async (ogShipment) => {
        ogShipment.fromManifest.forEach(async (manifest) => {
          const remaining = manifest.items.find((item) => {
            const match = receivedQuantities.find((r) =>
              r.item.toString().includes(item.item)
            );
            return match && Number(match.qty) < item.qty;
          });

          // We automatically create a new incomingDelivery with the exact same content as the original
          // except _id, receivedOn, receivedBy, reqceivedQuantities, when the qty is not fullfilled
          // the new incoming delivery.
          if (remaining) {
            const {
              _id,
              receivedOn,
              receivedBy,
              receivedQuantities,
              ...remaining
            } = incomingDelivery._doc;
            const remainingIncDelivery = new IncomingDelivery(remaining);
            await remainingIncDelivery.save();
          }
        });
      });

      const data = { message: "success" };
      return { data };
    },
    res,
    "setting received data for incoming delivery"
  );
}

async function getSourceShipmentLabel(id) {
  try {
    const shipment = await Shipment.findOne({ _id: id })
      .lean()
      .select("label")
      .exec();

    const { label } = shipment;

    const query = {
      label: {
        $regex: label,
        $options: "i",
      },
    };

    const numberOfDeliveries = await IncomingDelivery.countDocuments(query);

    const ret = {
      numberOfDeliveries,
      label,
    };
    return [, ret];
  } catch (error) {
    LogError(error);
    return [HTTPError("Unexpected error fetching shipment info for labeling.")];
  }
}

/**
 * Get one incomingDelivery by its _id field.
 * Get incomingDelivery, mutate manifest data to only have packing slip items, ...
 * ... auto generate createdBy (if needed) and source field (for now it will be ...
 * ... "VENDOR"), get workOrder infomation, set manifest.item infomation to ...
 * ... workOrder item information (only applicable fields for FE use)
 */
function getOne(req, res) {
  ExpressHandler(
    async () => {
      const { deliveryId } = req.params;
      const incomingDelivery = await IncomingDelivery.findOne({
        _id: deliveryId,
      })
        .populate({
          path: "sourceShipmentId",
          populate: {
            path: "manifest",
            model: "packingSlip",
          },
        })
        .lean()
        .exec();

      if (!incomingDelivery) return HTTPError("delivery not found");

      const { orderNumber } = incomingDelivery.sourceShipmentId.manifest[0];

      // mutate data as needed
      const newManifest = incomingDelivery.sourceShipmentId.manifest
        .map((ps) => ps.items)
        .flat();
      incomingDelivery.sourceShipmentId.manifest = newManifest;
      if (!incomingDelivery.createdBy) incomingDelivery.createdBy = "AUTO";
      incomingDelivery.source = "VENDOR";

      //get item information from workOrder
      const workOrder = await WorkOrder.findOne({ OrderNumber: orderNumber })
        .lean()
        .select("Items")
        .exec();

      if (!workOrder) return HTTPError("workOrder not found");
      if (workOrder.Items.length === 0)
        return HTTPError("no workOrder items found on workOrder");

      // update manifest[].item to item info (can reduce what info is set to reduce the amount of data being sent)
      for (const mItem of incomingDelivery.sourceShipmentId.manifest) {
        const itemId = mItem.item.toString();
        const _item = workOrder.Items.find((x) => x._id.toString() === itemId);
        if (!_item)
          return HTTPError(`item not found on workOrder ${orderNumber}`);

        // only send some data
        const { PartNumber, PartName, Revision, Quantity, batchNumber } = _item;
        mItem.item = { PartNumber, PartName, Revision, Quantity, batchNumber };
      }

      const data = { incomingDelivery };
      return { data };
    },
    res,
    "fetching incoming delivery"
  );
}

/**
 * used to get all incoming deliveries that have been delivered
 */
function getAllReceived(req, res) {
  ExpressHandler(
    async () => {
      const query = { receivedOn: { $exists: true } };
      const _receivedDeliveries = await IncomingDelivery.find(query)
        .lean()
        .select("label source receivedOn sourceShipmentId")
        .populate("sourceShipmentId")
        .exec();

      const receivedDeliveries = _receivedDeliveries
        .filter((x) => x.sourceShipmentId?.isPastVersion !== true)
        .map((d) => {
          delete d.sourceShipmentId;
          return d;
        });

      const data = { receivedDeliveries };
      return { data };
    },
    res,
    "getting all received incoming deliveries"
  );
}
async function checkId(res, next, model, id) {
  if (!id) {
    // Make sure id is provided
    res
      .status(400)
      .send(`Please provide an id for ${model.collection.collectionName}`);
  } else if (!ObjectId.isValid(id)) {
    // Verify if id is valid
    res
      .status(404)
      .send(`${id} for ${model.collection.collectionName} not valid`);
  } else {
    // Find the id and if it doesnt exist, raise an error
    const data = await model.findById(id).lean();
    // Check if the data exists
    if (!data) {
      res
        .status(404)
        .send(`${id} for ${model.collection.collectionName} not found`);
    } else {
      res.locals.data = data;
      next();
    }
  }
}
