const { Router } = require("express");
const router = Router();
const Shipment = require("./model");
const PackingSlip = require("../packingSlip/model");
const Customer = require("../customer/model");
const WorkOrder = require("../workOrder/model");
const IncomingDelivery = require('../incomingDelivery/model');
const { CreateNew } = require('../incomingDelivery/controller');
const User = require("../user/model");
const { GetPopulatedPackingSlips } = require("../packingSlip/controller");
const { ExpressHandler, HTTPError, LogError } = require("../utils");
var ObjectId = require("mongodb").ObjectId;
const { GetOrderFulfillmentInfo } = require("../../src/shopQ/controller");
const { CreateNew } = require("../incomingDelivery/controller");

module.exports = router;

router.get("/", getAll);
router.put("/", createOne);

router.get("/search", searchShipments);

router.get("/queue", getQueue);

router.post("/pdf", getAsPdf);

router.get("/:sid", getOne);
router.patch("/:sid", editOne);
router.delete("/:sid", deleteOne);

/**
 * Compute a search of shipment documents that match either a given order or a given part.
 * Further, results should be paginated according to the parameters
 * - resultsPerPage
 * - pageNumber
 *
 * TODO: this query should really be using a more sophisticated aggregation pipeline,
 *    but for testing, we're just pulling all docs and having the server truncate.
 */
async function searchShipments(req, res) {
  ExpressHandler(
    async () => {
      let {
        sortBy,
        sortOrder,
        matchOrder,
        matchPart,
        resultsPerPage,
        pageNumber,
      } = req.query;

      if (isNaN(+resultsPerPage) || resultsPerPage <= 0) {
        return HTTPError("resultsPerPage must be a positive integer.", 400);
      }

      if (sortBy !== "CUSTOMER" && sortBy !== "DATE") sortBy = "DATE";
      if (sortOrder === "-1" || sortOrder === "1") {
        sortOrder = parseInt(sortOrder);
      } else {
        sortOrder = 1;
      }
      if (isNaN(+pageNumber) || pageNumber < 1) pageNumber = 1;

      const [_, { allShipments }] = await getPopulatedShipmentData();

      let matchShipments;
      if (!matchOrder && !matchPart) {
        matchShipments = allShipments;
      } else {
        matchShipments = allShipments.filter((x) =>
          x.manifest.some(
            (y) =>
              (matchOrder && new RegExp(matchOrder, "i").test(y.orderNumber)) ||
              (matchPart &&
                y.items.some(
                  (z) =>
                    new RegExp(matchPart, "i").test(z.item?.partNumber) ||
                    new RegExp(matchPart, "i").test(z.item?.partDescription)
                ))
          )
        );
      }

      const sortFunc = (a, b) => {
        let testVal;
        if (sortBy === "CUSTOMER") {
          testVal = a.customer.tag.localeCompare(b.customer.tag);
        } else testVal = a.dateCreated.getTime() - b.dateCreated.getTime();

        if (testVal * sortOrder < 1) return -1;
        else return 1;
      };

      matchShipments.sort(sortFunc);

      const start = resultsPerPage * (pageNumber - 1);
      const end = resultsPerPage * pageNumber;

      const shipments = matchShipments.slice(start, end);

      return {
        data: {
          shipments,
          totalCount: matchShipments.length,
        },
      };
    },
    res,
    "searching shipments"
  );
}

/**
 * Get a list of packing slips that are ready to be shipped.
 * This essentially means we just want packing slips that have not yet been assigned to a shipment.
 */
async function getQueue(_req, res) {
  ExpressHandler(
    async () => {
      const [e, { packingSlips }] = await GetPopulatedPackingSlips(true);
      if (e) return HTTPError("Error fetching shipping queue.");

      return {
        data: {
          packingSlips,
        },
      };
    },
    res,
    "fetching shipping queue"
  );
}

/**
 * Get a list of all shipments
 */
async function getAll(_req, res) {
  ExpressHandler(
    async () => {
      const shipments = await Shipment.find()
        .populate("customer")
        .lean()
        .exec();

      return {
        data: {
          shipments,
        },
      };
    },
    res,
    "fetching shipments"
  );
}

/**
 * Create a new shipment given an orderNumber & manifest
 * trackingNumber & cost are optional at this stage
 */
async function createOne(req, res) {
  ExpressHandler(
    async () => {
      const {
        manifest,
        customer,
        trackingNumber,
        cost,
        deliveryMethod,
        carrier,
        deliverySpeed,
        customerAccount,
        customerHandoffName,
        shippingAddress,
        isDueBack,
        isDueBackOn
      } = req.body;

      if (isDueBack && !isDueBackOn) {
        return HTTPError('Return due date is missing.');
      }

      const customerDoc = await Customer.findOne({ _id: customer });
      const { tag, numShipments } = customerDoc;

      const shipmentId = `${tag}-SH${numShipments + 1}`;

      const shipment = new Shipment({
        customer,
        shipmentId,
        manifest,

        deliveryMethod,
        customerHandoffName,
        carrier,
        deliverySpeed,
        customerAccount,
        trackingNumber,
        cost,

        createdBy: req.user._id,
        specialShippingAddress: shippingAddress,
      });

      await shipment.save();

      if (isDueBack) {
        const [returnErr, ] = await CreateNew(undefined, req.user._id, isDueBackOn, shipment._id);
        if (returnErr) {
          await shipment.delete();
          return returnErr;
        }
      }

      // update all packing slips in manifest w/ this shipment's id
      const promises = manifest.map((x) =>
        PackingSlip.updateOne({ _id: x }, { $set: { shipment: shipment._id } })
      );

      customerDoc.numShipments = numShipments + 1;
      promises.push(customerDoc.save());

      await Promise.all(promises);

      return {
        data: {
          shipment,
        },
      };
    },
    res,
    "creating shipment"
  );
}

/**
 * Get a specified shipment by mongo _id
 */
async function getOne(req, res) {
  ExpressHandler(
    async () => {
      const { sid } = req.params;
      const [_, { allShipments }] = await getPopulatedShipmentData(sid);
      const shipment = allShipments[0];

      return {
        data: {
          shipment,
        },
      };
    },
    res,
    "fetching shipment"
  );
}

/**
 * Edit a specified shipment given its mongo _id & its new array items[]
 */
async function editOne(req, res) {
  ExpressHandler(
    async () => {
      const { sid } = req.params;
      let {
        deliveryMethod,
        cost,
        carrier,
        deliverySpeed,
        customerAccount,
        trackingNumber,
        customerHandoffName,
        deletedPackingSlips,
        newPackingSlips,
        shippingAddress,
        isDueBack,        //for incomingDeliveries
        isDueBackOn,      //for incomingDeliveries
      } = req.body;

      const p_deleted =
        deletedPackingSlips?.map((x) => unassignPackingSlipFromShipment(x)) ??
        [];

      const p_added =
        newPackingSlips?.map((x) => assignPackingSlipToShipment(x, sid)) ?? [];

      await updateShipmentTrackingHistory(sid);

      let updateDict = {};

      if (deliveryMethod) updateDict = { ...updateDict, deliveryMethod };
      if (cost) updateDict = { ...updateDict, cost };
      if (carrier) updateDict = { ...updateDict, carrier };
      if (deliverySpeed) updateDict = { ...updateDict, deliverySpeed };
      if (customerAccount) updateDict = { ...updateDict, customerAccount };
      if (trackingNumber) updateDict = { ...updateDict, trackingNumber };
      if (customerHandoffName)
        updateDict = { ...updateDict, customerHandoffName };
      if (shippingAddress)
        updateDict = { ...updateDict, specialShippingAddress: shippingAddress };

      // Update
      await Shipment.updateOne(
        { _id: sid },
        {
          $set: {
            ...updateDict,
          },
          $pull: {
            manifest: {
              $in: deletedPackingSlips?.map((e) => ObjectId(e)) ?? [],
            },
          },
        }
      );

      // then update newPackingSlips otherwise a conflict will occur
      await Shipment.updateOne(
        { _id: sid },
        {
          $push: {
            manifest: { $each: newPackingSlips?.map((e) => ObjectId(e)) ?? [] },
          },
        }
      );

      const promises = p_deleted.concat(p_added);
      await Promise.all(promises);

      //if no updates are needed return out 
      if ( isDueBack || ( !isDueBack && !isDueBackOn ) ) return;

      //update incoming deliveries as needed
      const incomingDeliveries = await IncomingDelivery.find( {
        sourceShipmentId: sid,
        receivedOn: { $exists: false }, 
      } );

      let deliveryIds = [];

      if ( !isDueBack ) {
        deliveryIds = incomingDeliveries.map( x => x._id );

        IncomingDelivery.deleteMany( {
          _id: { $in: deliveryIds }
        } );
      }

      // if it isDueBack and isDueBackOn then we want to either create a new incomingDelivery or modify existing ones
      else if ( isDueBack && isDueBackOn ) {
        if ( incomingDeliveries.length === 0 ) {

          //create new incomingDelivery
          const { _id } = req.user;
          const [err, internalPurchaseOrderNumber ] = await getPoNumberFromShipmentId(sid);
          if ( err ) return HTTPError(err);

          const _newIncomingDelivery = {
            internalPurchaseOrderNumber,
            creatingUserId: _id,
            isDueBackOn,
            sourceShipmentId: sid,
          }
          
          await CreateNew( _newIncomingDelivery );
        }
        else {
          //modify incomingDelivery
          deliveryIds = incomingDeliveries.map( x => x._id );
          IncomingDelivery.updateMany(query2, { isDueBackOn } );
        }
      }
      
    },
    res,
    "editing shipment"
  );
}

/**
 * Delete a specified shipment given its mongo _id
 */
async function deleteOne(req, res) {
  ExpressHandler(
    async () => {
      const { sid } = req.params;

      await updateShipmentTrackingHistory(sid);

      // delete shipment
      const p_delete = Shipment.deleteOne({ _id: sid });

      // update packing slips to unassign them from shipments
      const p_updatePackingSlips = PackingSlip.updateMany(
        { shipment: sid },
        { $unset: { shipment: 1 } }
      );

      await Promise.all([p_delete, p_updatePackingSlips]);
    },
    res,
    "deleting shipment"
  );
}

async function updateShipmentTrackingHistory(sid) {
  let oldShipment = {
    ...(await Shipment.findById(sid).lean().exec()),
    isPastVersion: true,
  };

  delete oldShipment["_id"];
  const editedShipment = new Shipment({
    ...oldShipment,
  });

  await editedShipment.save();
}

/**
 *
 * @param {any[]} packingSlipId Id of packing slip to assign
 * @param {string} shipmentId _id of Shipment to assign to packing slip
 */
async function assignPackingSlipToShipment(packingSlipId, shipmentId) {
  await PackingSlip.updateOne(
    { _id: packingSlipId },
    { $set: { shipment: shipmentId } }
  );
}

async function unassignPackingSlipFromShipment(packingSlipId) {
  await PackingSlip.updateOne(
    { _id: packingSlipId },
    { $unset: { shipment: 1 } }
  );
}

/**
 * Get shipment documents with manifest.items.item populated
 *
 * @param {(String | mongoose.Schema.Types.ObjectId)?} shipmentId
 */
async function getPopulatedShipmentData(shipmentId = undefined) {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "packingSlips",
          as: "manifest",
          let: { manifest: "$manifest" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$manifest"] },
              },
            },
            { $unwind: "$items" },
            {
              $lookup: {
                from: "workorders",
                let: {
                  // ---- FORMAT OF ITEMS ARRAY
                  // items: [{
                  //   _id,   // the front-end uses this to distinguish items (auto-generated)
                  //   item,  // ID of the item packed
                  //   qty    // packed qty of item
                  // }]
                  // --------------
                  arrayItemIds: "$items._id",
                  packedItemIds: "$items.item",
                  packedItemQtys: "$items.qty",
                  orderNumber: "$orderNumber",
                  packingSlipOID: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$OrderNumber", "$$orderNumber"] },
                    },
                  },
                  { $unwind: "$Items" },
                  {
                    $match: {
                      $expr: { $eq: ["$Items._id", "$$packedItemIds"] },
                    },
                  },
                  {
                    $group: {
                      _id: "$Items._id",
                      item: {
                        $first: {
                          _id: "$Items._id",
                          orderNumber: "$Items.OrderNumber",
                          partNumber: "$Items.PartNumber",
                          partDescription: "$Items.PartName",
                          partRev: "$Items.Revision",
                          batch: "$Items.batchNumber",
                          quantity: "$Items.Quantity", // batchQty
                        },
                      },
                      packingSlipId: { $first: "$$packingSlipOID" },
                      packedQty: { $first: "$$packedItemQtys" },
                      rowId: { $first: "$$arrayItemIds" },
                      isPastVersion: {
                        $first: {
                          isPastVersion: "$isPastVersion",
                        },
                      },
                    },
                  },
                  {
                    $addFields: {
                      _id: "$rowId",
                    },
                  },
                ],
                as: "items",
              },
            },
            {
              $group: {
                _id: { $arrayElemAt: ["$items.packingSlipId", 0] },
                items: {
                  $push: {
                    _id: { $arrayElemAt: ["$items.rowId", 0] },
                    item: { $arrayElemAt: ["$items.item", 0] },
                    qty: { $arrayElemAt: ["$items.packedQty", 0] },
                  },
                },
                customer: { $first: "$customer" },
                orderNumber: { $first: "$orderNumber" },
                packingSlipId: { $first: "$packingSlipId" },
                createdBy: { $first: "$createdBy" },
                dateCreated: { $first: "$dateCreated" },
                shipment: { $first: "$shipment" },
                destination: { $first: "$destination" },
              },
            },
          ],
          as: "manifest",
        },
      },
      {
        $lookup: {
          from: "oldClients-v2",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $addFields: {
          customer: { $arrayElemAt: ["$customer", 0] },
        },
      },
    ];

    if (shipmentId) {
      pipeline.splice(0, 0, {
        $match: { _id: ObjectId(shipmentId) },
      });
    }

    pipeline.push({
      $match: {
        isPastVersion: { $ne: true },
      },
    });

    const allShipments = await Shipment.aggregate(pipeline);

    return [null, { allShipments }];
  } catch (e) {
    LogError(e);
    return [e];
  }
}

async function getAsPdf(req, res) {
  ExpressHandler(
    async () => {
      const { manifest, customer, dateCreated, shipmentId, deliveryMethod } = req.body;
      const { title } = customer;

      const orderNumbers = new Set( manifest.map( x => x.orderNumber ) );

      const manifestBlocks = [];
      const purchaseOrderNumbers = [];
      const allShipmentsInfo = [];

      let idx = 0;
      for ( const orderNumber of orderNumbers ) {
        const promises = [];

        promises.push( WorkOrder.findOne({ OrderNumber: orderNumber })
          .lean()
          .select('purchaseOrderNumber')
          .exec()
        );

        promises.push(GetOrderFulfillmentInfo(orderNumber))

        const [woDoc, [shippingError, shipmentInfo] ] = await Promise.all(promises);
        const { purchaseOrderNumber } = woDoc;
        purchaseOrderNumbers.push(purchaseOrderNumber);

        if ( shippingError ) HTTPError('getting shipping contact information');
        
        allShipmentsInfo.push(shipmentInfo);

        const _report = {};
        const packingSlips = manifest.filter( x => x.orderNumber === orderNumber );
        for ( const ps of packingSlips ) {
          const { items } = ps;
      
          for (const i of items ) {
            const { item, qty } = i;
            const { _id } = item;
            
            if ( _id in _report === false ) {
              _report[_id] = item;
              _report[_id].qtyShipped = qty;
            }
            else {
              _report[_id].qtyShipped += qty;
            }
          }
        }

        const items = Object.values(_report); 

        const pageBreakAfter =  ( orderNumbers.size !== 1 && idx !== (orderNumbers.size - 1) );

        const tableTitleArr = [ `ORDER: ${orderNumber}` ];
        ( purchaseOrderNumber )  ?
          tableTitleArr.push(`PO: ${purchaseOrderNumber}`) :
          tableTitleArr.push('');

        manifestBlocks.push(_pdf_makeManifestBlock(items, tableTitleArr, pageBreakAfter));
        idx += 1;
      }
      

      if ( !allShipmentsInfo[0]?.shippingContact || allShipmentsInfo.length === 0 ) { 
        return HTTPError('No shipping contact info ')
      }

      //because all packing ships on a shipment SHOULD be shipping to the same address/contact info
      const shippingBlock = _pdf_makePackingBlock(title, allShipmentsInfo[0].shippingContact);
      const bannerBlock = _pdf_makeBannerBlock( new Date(dateCreated) );

      const signatureBlock = _pdf_makeSignaturesBlock(deliveryMethod);
      
      const docDefinition = {
        content: [
          bannerBlock,
          shippingBlock,
          ...manifestBlocks,
          signatureBlock,
        ],
        header: {
          text: shipmentId,
          alignment: "left",
          margin: [10, 20, 0, 0],
          fontSize: 10,
        },
        footer: {
          text: "THANK YOU FOR YOUR BUSINESS",
          alignment: "center",
          bold: true,
        },
      };
    
      const filename = shipmentId + ".pdf";
      const data = { docDefinition, filename };
      return { data };
    },
    res,
    'creating shipment pdf layout'
  );
}

function _pdf_makeBannerBlock( dateCreated) {
  const table = {
    widths: ["auto", "*", "auto"],
    body: [
      [
        { rowSpan: 2, image: _pdf_GetLogoURI(), width: 200 },
        {
          colSpan: 2,
          text: "SHIPMENT",
          bold: true,
          fontSize: 24,
          color: "#6F6F6F",
          alignment: "right",
          margin: [0, 0, 15, 0],
        },
        {},
      ],
      [
        {},
        { text: "DATE: ", alignment: "right", bold: true },
        dateCreated.toLocaleDateString(),
      ],
    ],
  };

  const ret = {
    table,
    layout: "noBorders",
    style: { fillColor: "#e1e1e1" },
    // margin: [0, 15, 0, 15]
  };

  return ret;
}



function _pdf_makePackingBlock(customerTitle, shippingContact) {
  const bypassShipToCheck =
    !process.env.SHOPQ_URL && process.env.NODE_ENV === "DEBUG";

  if (!shippingContact && !bypassShipToCheck) {
    return HTTPError(
      "Shipping contact not set! Please contact sales rep.",
      400
    );
  }

  const body = [[{ text: "SHIP TO", bold: true }]];

  const { address, name } = shippingContact;
  const { line1, line2, line3, line4 } = address || {};

  body.push([customerTitle], [line1]);

  if (line2) body.push([line2]);
  if (line3) body.push([line3]);
  if (line4) body.push([line4]);
  body.push(["ATTN: " + name]);

  const ret = {
    table: { body },
    layout: "noBorders",
    margin: [0, 20, 0, 20],
  };

  return ret;
}

/**
 * Make signature block
 * @param {String} packedByuUsernam
 */
 function _pdf_makeSignaturesBlock(deliveryMethod) {

  const _table =  { 
    table: {
      widths: ["*", "*"],
    },
    unbreakable: true,
  };

  let deliveryTypeString;
  let secondColumnSignoff;
  if ( ['DROPOFF', 'PICKUP'].includes(deliveryMethod) ) {
    deliveryTypeString = 'Received by:';
    secondColumnSignoff = "X __________________________";
  }
  else {
    deliveryTypeString = '';
    secondColumnSignoff = '';
  }

  _table.table.body = [
    [
      {
        text: "Packed by: ",
        bold: true,
        border: [false, false, false, false],
      },
      {
        text: deliveryTypeString,
        bold: true,
        border: [false, false, false, false],
        alignment: "left",
      },
    ],
    [
      {
        text: "X __________________________",
        border: [false, false, false, false],
      },
      {
        text: secondColumnSignoff,
        border: [false, false, false, false],
      },
    ],
  ];

  return _table;
}

/**
 * Make the manifest block.
 * This includes only the line items in the
 * @param {any[]} items Items in the packing slip
 */
 function _pdf_makeManifestBlock(items, tableTitleArr, pageBreak) {
  const body = [
    [
      {
        colSpan: 2,
        text: tableTitleArr[0],
        fillColor: "#cccccc",
        bold: true,
        border: [true, true, false, true],
      },
      {},
      {
        colSpan: 2,
        text: tableTitleArr[1],
        fillColor: "#cccccc",
        bold: true,
        border: [false, true, true, true],
        alignment: "right",
      },
      {},
    ],
    [
      { text: "LINE" },
      { text: "ITEM" },
      { text: "ORDER QTY" },
      { text: "SHIP QTY" },
    ],
  ];

  body[1].forEach((x) => {
    x.fillColor = "#cccccc";
    x.bold = true;
    x.alignment = "center";
  });

  let lineNumber = 0;
  for (const i of items) {

    // here, 'quantity' refers to the quantity ordered in the PO
    const { partNumber, partDescription, partRev, quantity, qtyShipped } = i;
    const qtyOrdered = quantity;

    let lineText = "";
    if (partNumber && partNumber?.trim() !== "-") lineText = partNumber;
    if (partRev && partRev?.trim() !== "-") lineText += ` Rev ${partRev}`;
    lineText = lineText.trim();
    if (partDescription && partDescription?.trim() !== "-")
      lineText += "\n " + partDescription;

    const row = [
      { text: lineNumber + 1, alignment: "center" },
      { text: lineText },
      { text: `${qtyOrdered}`, alignment: "right" },
      { text: `${qtyShipped}`, alignment: "right" },
    ];

    if (i % 2) row.forEach((x) => (x.fillColor = "#e1e1e1"));

    body.push(row);
  }

  const widths = ["auto", "*", "auto", "auto"];
  const table = {
    widths,
    body,
    headerRows: 1,
  };
  const ret = {
    table,
    margin: [0, 20, 0, 20],
  };
  if ( pageBreak ) ret.pageBreak = 'after';

  return ret;
}

/**
 * used to get poNumber from the shipment  _id value
 * @param {String} sid -  shipment._id as a string
 * @returns poNumber (String)
 */
 async function getPoNumberFromShipmentId(sid) {
  try {
    const agg = [
      { $match: {
        $expr: {
          $eq: ['$_id', { $toObjectId: sid }]
        }
      } },
      { $lookup: {
        from: 'packingSlips',
        let: { manifest: { $arrayElemAt: ['$manifest', 0] } },
        pipeline: [
          { $match: { 
            $expr: { $eq: ['$$manifest', '$_id'] }
          } },
          { $lookup: {
            from: 'workorders',
            let: { orderNumber: '$orderNumber' },
            pipeline: [
              { $match: {
                $expr: { $eq: ['$$orderNumber', '$OrderNumber'] }
              } },
              { $addFields: {
                'poNumber': '$purchaseOrderNumber'
              } },
              { $project: {
                'poNumber': 1, 
                '_id': 0,
              }}
            ],
            as: 'workOrder'
          } },
        ],
        as: 'packingSlips'
      }}
    ];
    const ret = await Shipment.aggregate(agg);
    const { poNumber } = ret[0].packingSlips[0].workOrder[0];
    return [ , poNumber ];
  } 
  catch (error) {
    return [error];
  }
}

function _pdf_GetLogoURI() {
  const BASE64_IMG = `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`;
  return "data:image/png;base64," + BASE64_IMG;
}


