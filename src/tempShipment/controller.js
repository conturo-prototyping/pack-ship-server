const { Router } = require("express");
const router = Router();
const TempShipment = require("./model");
const { ExpressHandler, HTTPError } = require("../utils");

module.exports = router;

router.put("/", createOne);

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
