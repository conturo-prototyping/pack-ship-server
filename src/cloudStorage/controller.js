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
      const { location } = req.body;
      const url = await generateSignedURL("write", location);

      return {
        data: {
          url
        }
      };
    },
    res,
    "generate signed upload"
  );
}

async function deleteCloudStorageObject(filepath) {
  await storage.bucket(CLOUD_STORAGE_BUCKET_NAME).file(filepath).delete();
}

async function generateSignedURL(action, filepath) {
  const options = {
    version: "v4",
    action: action,
    expires: Date.now() + 60 * 60 * 1000, // 60 minutes
  };

  // Get a v4 signed URL for uploading file
  const [url] = await storage
    .bucket(CLOUD_STORAGE_BUCKET_NAME)
    .file(filepath)
    .getSignedUrl(options);

  return url;
}

async function getCloudStorageObjectMetadata(filepath) {
  const [metadata] = await storage
    .bucket(CLOUD_STORAGE_BUCKET_NAME)
    .file(filepath)
    .getMetadata();

  return metadata;
}

async function getCloudStorageObjectDownloadURL(filepath) {
  const metadata = await getCloudStorageObjectMetadata(filepath);
  const url = await generateSignedURL("read", filepath);

  return [url, metadata.contentType];
}
