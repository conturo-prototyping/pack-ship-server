const { Router } = require("express");
const router = Router();
const TempShipment = require("./model");
const { ExpressHandler, HTTPError } = require("../utils");
const { BlockNonAdmin } = require("../user/controller");

module.exports = router;

router.put("/", createOne);
router.delete("/:tsid", BlockNonAdmin, deleteOne);

/**
 * Create a new temp shipment given a manifest
 */
async function createOne(req, res) {
  ExpressHandler(
    async () => {
      const { manifest } = req.body;

      if (!manifest) return HTTPError("Manifest must be specified", 400);

      const tempShipment = new TempShipment({
        manifest,
      });

      await tempShipment.save();

      return {
        data: {
          tempShipment,
        },
      };
    },
    res,
    "creating temp shipment"
  );
}

/**
 * Delete a new temp shipment given a manifest
 */
async function deleteOne(req, res) {
  ExpressHandler(
    async () => {
      const { tsid } = req.params;

      const tmpShipment = await TempShipment.findById(tsid);

      if (!tmpShipment)
        return HTTPError("Temporary Shipment does not exist", 400);

      // delete temp shipment
      await TempShipment.deleteOne({ _id: tsid });
    },
    res,
    "deleting temp shipment"
  );
}
