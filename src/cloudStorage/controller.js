const { Router } = require("express");
const { Storage } = require("@google-cloud/storage");
const { CLOUD_STORAGE_BUCKET_NAME } = process.env;
const { LogError, ExpressHandler, HTTPError } = require("../utils");

const router = Router();

module.exports = {
  router,
  deleteCloudStorageObject,
  getCloudStorageObjectDownloadURL,
};

router.post("/upload", generateSignedUploadURL);

const storage = new Storage();

/**
 * Generates a signed upload URL for uploading to Cloud Storage
 */
async function generateSignedUploadURL(req, res) {
  ExpressHandler(
    async () => {
      let { location } = req.body;

      return { data: { url: await generateSignedURL("write", location) } };
    },
    res,
    "fetching packing slips"
  );
}

async function deleteCloudStorageObject(filepath) {
  const deleteOptions = {
    ifGenerationMatch: generationMatchPrecondition,
  };
  const [url] = await storage
    .bucket(CLOUD_STORAGE_BUCKET_NAME)
    .file(filepath)
    .delete(deleteOptions);
}

async function generateSignedURL(action, filepath) {
  const options = {
    version: "v4",
    action: action,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  // Get a v4 signed URL for uploading file
  const [url] = await storage
    .bucket(CLOUD_STORAGE_BUCKET_NAME)
    .file(filepath)
    .getSignedUrl(options);

  return url;
}

async function getCloudStorageObjectDownloadURL(filepath) {
  return await generateSignedURL("read", filepath);
}
