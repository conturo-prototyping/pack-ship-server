const { Router } = require("express");
const router = Router();
const { LogError, ExpressHandler, HTTPError } = require("../utils");
const ObjectId = require("mongodb").ObjectId;
const IncomingDelivery = require("./model");
const IncomingDeliveryHistory = require("./model.history");
const PackingSlip = require("../packingSlip/model");
const WorkOrder = require("../workOrder/model");
const WorkOrderPO = require("../workOrderPO/model");
const ConsumablePO = require("../consumablePO/model");
const Shipment = require("../shipment/model");
const dayjs = require("dayjs");
const { BlockNonAdmin } = require("../user/controller");

const DEFAULT_BUSINESS_DAYS = 10;

router.get("/", getAll);
router.put("/", createOne);
router.put( '/autoGen', CreateConsumablePO );
router.get("/queue", getQueue);
router.post("/receive", setReceived);

router.post(
  "/:deliveryId/undoReceive",
  BlockNonAdmin,
  (req, res, next) =>
    checkId(res, next, IncomingDelivery, req.params.deliveryId),
  undoReceive,
  recordHistory
);

router.get("/allReceived", getAllReceived);
router.get("/:deliveryId", getOne);

router.put(
  "/cancel",
  (req, res, next) => checkId(res, next, IncomingDelivery, req.body._id),
  setCanceled
);

router.patch(
  "/:deliveryId",
  (req, res, next) =>
    checkId(res, next, IncomingDelivery, req.params.deliveryId),
  editOne,
  recordHistory
);

router.patch(
  "/:deliveryId/undoReceipt",
  (req, res, next) =>
    checkId(res, next, IncomingDelivery, req.params.deliveryId),
  undoReceipt,
  recordHistory
);

const POTypes = {
  WorkOrder: "WorkOrderPO",
  Consumable: "ConsumablePO",
};

module.exports = {
  router,
  CreateNew,
};

/**
 * Create a new incomingDelivery.model.history document with the contents of the CURRENT incomingDelivery.model
 * THEN delete the matching model doc
 */
function undoReceive(req, res, next) {
  ExpressHandler(
    async () => {
      const { _id } = res.locals.data;

      try {
        await IncomingDelivery.deleteOne({ _id: ObjectId(_id) });
        next();
      } catch (error) {
        LogError(error);

        return HTTPError(`Unexpected error calling undoReceive with ${_id}.`);
      }
    },
    res,
    "undo receive"
  );
}

/**
 * Clear the linesReceived of the current incomingDelivery
 */
function undoReceipt(req, res, next) {
  ExpressHandler(
    async () => {
      const { _id, receivedBy, receivedOn, ...incomingDel } = res.locals.data;

      try {
        await IncomingDelivery.updateOne(
          { _id: _id },
          {
            $set: {
              ...incomingDel,
              linesReceived: [],
            },
            $unset: {
              receivedOn: 1,
              receivedBy: 1,
            },
          }
        );
        next();
      } catch (error) {
        LogError(error);

        return HTTPError(`Unexpected error undoing receipt with ${_id}.`);
      }
    },
    res,
    "undoing delivery receipt"
  );
}

function recordHistory(req, res) {
  ExpressHandler(
    async () => {
      const { _id, ...incomingDel } = res.locals.data;
      const editMadeBy = req.user._id;

      try {
        const incDelHist = new IncomingDeliveryHistory({
          editMadeBy,
          ...incomingDel,
        });

        await incDelHist.save();
      } catch (error) {
        LogError(error);

        return HTTPError(`Unexpected error recording history for ${_id}.`);
      }
    },
    res,
    "recording delivery history"
  );
}

/**
 * Create a new incomingDelivery.model.history document with the contents of the CURRENT incomingDelivery.model
 * THEN commit changes
 */
function editOne(req, res, next) {
  ExpressHandler(
    async () => {
      const { _id, ...incomingDel } = res.locals.data;
      const edited = req.body;

      try {
        const updated = {
          ...incomingDel,
          ...edited,
        };
        await IncomingDelivery.updateOne({ _id: _id }, { $set: updated });
        next();
      } catch (error) {
        LogError(error);

        return HTTPError(`Unexpected error calling editOne with ${_id}.`);
      }
    },
    res,
    "editing delivery"
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
  sourceShipmentId = undefined,
  workOrderPOId = undefined
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
      sourcePOId: workOrderPOId,
      sourcePoType: POTypes.WorkOrder,
    };

    const newIncomingDelivery = new IncomingDelivery(deliveryInfo);
    await newIncomingDelivery.save();

    const message = `New incoming delivery (${newIncomingDelivery.label}) created.`

    return [, { incomingDelivery: newIncomingDelivery, message }];
  } catch (error) {
    LogError(error);
    return [HTTPError("Unexpected error creating incoming delivery.")];
  }
}

/**
 * Fetch all incoming deliveries ever created.
 */
function getAll(req, res) {
  ExpressHandler(
    async () => {

      return HTTPError('Route not implemented.')
      const data = { message: 'worked getting all incoming deliveries' };
      
      return { data };
    },
    res,
    'getting all incoming deliveries'
  );
}

/**
 * Create a single incoming delivery.
 * Use this only for manual entries.
 */
function createOne(req, res) {
  ExpressHandler(
    async () => {
      const { internalPurchaseOrderNumber, isDueBackOn, sourceShipmentId } =
        req.body;

      // for external requests
      const { authUserId } = req.locals;

      const [err, data] = await CreateNew(
        internalPurchaseOrderNumber,
        req.user?._id || authUserId,
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

function CreateConsumablePO( req, res ) {
  ExpressHandler(
    async () => {
      const { sourcePOId, poNumber } = req.body;
      if ( !sourcePOId ) return HTTPError( 'Source doc Id not provided found.', 400 );
      if ( !poNumber ) return HTTPError( 'PO number not provided found.', 400 );

      // TODO: need to make this some way to default to 10 business days
      const isDueBackOn = req.body.isDueBackOn || addBusinessDays(DEFAULT_BUSINESS_DAYS, true);
      
      const userId = req?.user?._id || req?.body?.authUserId;

      if ( !userId ) return HTTPError( 'No userId found, cannot complete creating consumable PO.', 400 );
      const label = 'PO' + poNumber + '-R';

      const autoIncomingDelivery = new IncomingDelivery({
        label,
        createdBy: userId,
        sourcePoType: 'purchaseOrders',
        sourcePOId,
        isDueBackOn,    // this might be undefined
      });
      
      await autoIncomingDelivery.save();

      const data = { 
        newIncomingDelivery: autoIncomingDelivery,
        message: `Incoming delivery ${label} has been created.`
      };

      return { data };
    },
    res,
    'auto generating incoming delivery for PO'
  );
}

/**
 * Get the queue of incoming deliveries that have not yet been received.
 */

function getQueue(req, res) {
  ExpressHandler(
    async () => {
      const workOrderPOQueue = await IncomingDelivery.aggregate([
        {
          $match: {
            sourcePoType: POTypes.WorkOrder,
            receivedOn: { $exists: false },
            $or: [{ canceled: false }, { canceled: undefined }],
          },
        },
        {
          $lookup: {
            localField: "sourcePOId",
            from: "WorkOrderPOs",
            foreignField: "_id",
            as: "po",
          },
        },
      ]).exec();

      for (let i = 0; i < workOrderPOQueue.length; i++) {
        if ( workOrderPOQueue.length === 0 ) continue;

        const lines = workOrderPOQueue[i].po[0]?.lines;

        for (let j = 0; j < lines?.length || 0; j++) {
          if ( !lines || lines?.length === 0 ) continue;
          
          const line = lines[j];

          const [packingSlip, workorderItem] = await Promise.all([
            PackingSlip.findById(line["packingSlipId"]),
            WorkOrder.aggregate([
              { $match: { "Items._id": line["itemId"] } },
              {
                $project: {
                  Items: {
                    $filter: {
                      input: "$Items",
                      as: "item",
                      cond: { $eq: ["$$item._id", line["itemId"]] },
                    },
                  },
                },
              },
            ]),
          ]);
          workOrderPOQueue[i]["po"][0]["lines"][j]["packingSlip"] = packingSlip;

          const { Items } = workorderItem[0];
          workOrderPOQueue[i]["po"][0]["lines"][j]["item"] = Items[0];
        }
      }

      const consumablePOQueue = await IncomingDelivery.aggregate([
        {
          $match: {
            // sourcePoType: POTypes.Consumable,    // OLD CODE
            sourcePoType: 'purchaseOrders',
            receivedOn: { $exists: false },
            $or: [{ canceled: false }, { canceled: undefined }],
          },
        },
        {
          $lookup: {
            localField: "sourcePOId",
            from: "ConsumablePOs",
            foreignField: "_id",
            as: "po",
          },
        },
      ]).exec();

      const data = {
        workOrderPOQueue,
        consumablePOQueue,
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
      const { _id, sourcePOType, sourcePOId, linesReceived } = req.body;
      const userId = req.user._id;
      const incomingDelivery = await IncomingDelivery.findOne({
        _id,
      });

      if (incomingDelivery.receivedOn)
        return HTTPError("Delivery already received.", 400);

      incomingDelivery.receivedOn = new Date();
      incomingDelivery.receivedBy = userId;
      incomingDelivery.linesReceived = linesReceived;
      await incomingDelivery.save();

      // Joing to packingSlips collection to find qty per item
      let ogPO = undefined;

      if (sourcePOType === POTypes.WorkOrder) {
        ogPO = await WorkOrderPO.findById(sourcePOId);
      } else if (sourcePOType === POTypes.Consumable) {
        ogPO = await ConsumablePO.findById(sourcePOId);
      }

      // Check quantities we are receiving now + past received quantities
      //  against quantities that are due.
      // If qty is not fulfilled, make a copy with a new label to be received again
      let isReturnFulfilled = true;
      const allDeliveries = await IncomingDelivery.find({
        sourcePOId: incomingDelivery.sourcePOId,
      }).lean();

      const labelMatch = incomingDelivery.label.match(
        /SHIP-(.+)-([0-9]+)-R([0-9]+)?/
      );

      const customerTag = labelMatch[1];
      const shipmentNumber = labelMatch[2];

      let newLabel = `SHIP-${customerTag}-${shipmentNumber}-R${
        allDeliveries.length + 1
      }`;

      // reduce all incomingDeliveries.receivedQuantities into uniques
      const allReceivedQuantities = allDeliveries.reduce((acc, curr) => {
        curr.linesReceived.forEach((x) => {
          if (x.poLineId in acc === false) acc[x.poLineId] = 0;
          acc[x.poLineId] += x.qtyReceived;
        });

        return acc;
      }, {});

      // check source shipment manifests against all received quantities
      ogPO.lines.forEach((x) => {
        const receivedItemQty = allReceivedQuantities[x._id];
        if (receivedItemQty < x.qtyRequested) {
          isReturnFulfilled = false;
        }
      });

      // return isn't fulfilled, make another "incomingDelivery" entry
      // that we're expecting in the future
      if (!isReturnFulfilled) {
        const { _id, receivedOn, receivedBy, linesReceived, ...rest } =
          incomingDelivery._doc;

        const remainingIncDelivery = new IncomingDelivery({
          ...rest,
          label: newLabel,
        });

        remainingIncDelivery.save();
      }

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
 *
 * ... auto generate createdBy (if needed) and source field (for now it will be ...
 * ... "VENDOR"), get workOrder infomation, set manifest.item infomation to ...
 * ... workOrder item information (only applicable fields for FE use)
 */
function getOne(req, res) {
  ExpressHandler(
    async () => {
      const { deliveryId } = req.params;
      if (!deliveryId) return HTTPError("DeliveryId is required.", 400);

      let incomingDelivery = await IncomingDelivery.findOne({
        _id: deliveryId,
      }).lean();

      if (!incomingDelivery)
        return HTTPError("Incoming delivery not found.", 404);

      // mutate data as needed
      if (!incomingDelivery.createdBy) incomingDelivery.createdBy = "AUTO";
      incomingDelivery.source = "VENDOR";

      let items = undefined;
      //get item information from workOrder
      if (incomingDelivery.sourcePoType === POTypes.WorkOrder) {
        items = await WorkOrderPO.findById(incomingDelivery.sourcePOId).lean();

        const itemList = [];

        // set incomingDelivery.receivedQuantities[].item to item info
        // (can reduce what info is set to reduce the amount of data being sent)
        for (const el of incomingDelivery.linesReceived) {
          const lineId = String(el.poLineId);
          const woMatch = items.lines.find((x) => String(x._id) === lineId);

          if (!woMatch) return HTTPError(`Item not found on workOrder.`);

          const workOrder = await WorkOrder.aggregate([
            { $match: { "Items._id": woMatch["itemId"] } },
            {
              $project: {
                Items: {
                  $filter: {
                    input: "$Items",
                    as: "item",
                    cond: { $eq: ["$$item._id", woMatch["itemId"]] },
                  },
                },
              },
            },
          ]);

          if (!workOrder) return HTTPError(`WorkOrder not found for Item.`);

          const { PartNumber, PartName, Revision, Quantity, batchNumber } =
            workOrder[0].Items[0];
          itemList.push({
            PartNumber,
            PartName,
            Revision,
            Quantity,
            batchNumber,
            _id: lineId,
            poLineId: lineId,
            ...el,
          });
        }

        incomingDelivery.linesReceived = itemList;
      } else if (incomingDelivery.sourcePoType === POTypes.Consumable) {
        items = await ConsumablePO.findById(incomingDelivery.sourcePOId).lean();

        const itemList = [];

        for (const el of incomingDelivery.linesReceived) {
          const lineId = String(el.poLineId);
          const poMatch = items.lines.find((x) => String(x._id) === lineId);

          itemList.push({
            ...el,
            ...poMatch,
            Quantity: poMatch.qtyRequested,
            qty: el.qtyReceived,
          });
        }

        incomingDelivery.linesReceived = itemList;
      }

      if (!items) return HTTPError("Order not found.", 404);
      if (items.lines.length === 0)
        return HTTPError("No Order Items found on Order.", 404);

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
      const receivedWorkOrders = await IncomingDelivery.aggregate([
        {
          $match: {
            sourcePoType: "WorkOrderPO",
            receivedOn: { $exists: true },
          },
        },
        {
          $lookup: {
            localField: "sourcePOId",
            from: "WorkOrderPOs",
            foreignField: "_id",
            as: "sourcePOId",
          },
        },
      ]).exec();

      const receiveConsumables = await IncomingDelivery.aggregate([
        {
          $match: {
            sourcePoType: "ConsumablePO",
            receivedOn: { $exists: true },
          },
        },
        {
          $lookup: {
            localField: "sourcePOId",
            from: "ConsumablePOs",
            foreignField: "_id",
            as: "sourcePOId",
          },
        },
      ]).exec();

      const receivedDeliveries = [...receiveConsumables, ...receivedWorkOrders];
      const data = { receivedDeliveries };
      return { data };
    },
    res,
    "getting all received incoming deliveries"
  );
}

/**
 * Used to cancel an incomingDelivery
 */
function setCanceled(req, res) {
  ExpressHandler(
    async () => {
      const { ...incomingDelivery } = res.locals.data;
      const { _id, reason } = req.body;

      if (!reason) return HTTPError(`Reason is required.`, 400);

      if (incomingDelivery.canceled)
        return HTTPError(`Incoming Delivery already canceled.`, 400);

      if (incomingDelivery.receivedBy)
        return HTTPError(
          `Incoming Delivery isn't available to be canceled.`,
          400
        );

      await IncomingDelivery.updateOne(
        { _id: _id },
        {
          $set: {
            canceled: true,
            canceledReason: reason,
            canceledOn: Date.now(),
            canceledBy: req.user._id,
          },
        }
      );

      const data = { message: "success" };
      return { data };
    },
    res,
    "creating an incoming delivery"
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



function addBusinessDays( days, dateStringOnly ) {
  const date = new Date();
  let i = days;
  while( i > 0 ) {
    const day = date.getDay();
    if ( ![0, 6].includes(day) ) {
      i --;
    }
    date.setDate( date.getDate() + 1 );
  }

  if ( dateStringOnly ) {
    return date.toISOString().split('T')[0]
  }

  return date;
}