const { Router } = require("express");
var QRCode = require("qrcode");
const { LogError, ExpressHandler, HTTPError } = require("../utils");
const { generateJWT } = require("../jwt/controller");

const router = Router();

module.exports = {
  router,
  generateTempShipmentUploadQRCode,
};

router.post("/getTempShipCode", generateTempShipmentUploadQRCode);

/**
 * Generates a signed upload URL for uploading to Cloud Storage
 */
async function generateTempShipmentUploadQRCode(req, res) {
  ExpressHandler(
    async () => {
      let { tempShipmentId } = req.body;

      if (!tempShipmentId)
        return HTTPError(
          "Temp Shipment ID required to create a QRCode for temp shipment uploads",
          400
        );

      const token = await generateJWT(req.user._id);

      const params = {
        token,
        tempShipmentId,
      };

      const encodedParams = new URLSearchParams(params);

      let dataURL = `${
        process.env.CORS_CLIENT_URL
      }/?${encodedParams.toString()}`;

      let srcImage = await QRCode.toDataURL(dataURL);

      return { data: { qrCode: srcImage } };
    },
    res,
    "generate QR Code for temp shipment image uploads"
  );
}
