const { Router } = require("express");
const { Storage } = require("@google-cloud/storage");
const { CLOUD_STORAGE_BUCKET_NAME } = process.env;
const { LogError, ExpressHandler, HTTPError } = require("../utils");

const router = Router();

module.exports = { router };

router.post("/upload", generateSignedUploadURL);

/**
 * Generates a signed upload URL for uploading to Cloud Storage
 */
async function generateSignedUploadURL(req, res) {
  ExpressHandler(
    async () => {
      let { location } = req.body;

      const storage = new Storage();

      const options = {
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      };

      // Get a v4 signed URL for uploading file
      const [url] = await storage
        .bucket(CLOUD_STORAGE_BUCKET_NAME)
        .file(location)
        .getSignedUrl(options);

      return { data: { url } };
    },
    res,
    "fetching packing slips"
  );
}
