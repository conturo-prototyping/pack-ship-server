const TempShipment = require("../tempShipment/model");
const {
  getCloudStorageObjectDownloadURL,
} = require("../cloudStorage/controller.js");

module.exports = (io) => {
  const joinTemp = async function (payload) {
    const socket = this;
    if (payload.tempShipmentId) {
      socket.join(payload.tempShipmentId);

      const tempShipment = await TempShipment.findById(payload.tempShipmentId);

      io.to(payload.tempShipmentId).emit("joinedRoom", {
        tempShipmentId: payload.tempShipmentId,
        imagePaths: tempShipment?.shipmentImages,
        imageUrls: tempShipment
          ? await Promise.all(
              tempShipment?.shipmentImages.map(async (e) => {
                const data = await getCloudStorageObjectDownloadURL(e);
                return { url: data[0], type: data[1], path: e };
              })
            )
          : [],
      });
    }
  };

  const uploadDone = async function (payload) {
    const socket = this;
    const tempShipmentId = payload.tempShipmentId;

    await TempShipment.findByIdAndUpdate(tempShipmentId, {
      $push: { shipmentImages: { $each: payload.imagePaths } },
    });

    const tempShipment = await TempShipment.findById(tempShipmentId);

    socket.broadcast.to(tempShipmentId).emit("newUploads", {
      tempShipmentId,
      imagePaths: tempShipment.shipmentImages,
      imageUrls: await Promise.all(
        tempShipment.shipmentImages.map(async (e) => {
          const data = await getCloudStorageObjectDownloadURL(e);
          return { url: data[0], type: data[1], path: e };
        })
      ),
    });
  };

  const deleteUpload = async function (payload) {
    const socket = this;
    const tempShipmentId = payload.tempShipmentId;

    await TempShipment.findByIdAndUpdate(tempShipmentId, {
      $pull: { shipmentImages: payload.imagePath },
    });

    const tempShipment = await TempShipment.findById(tempShipmentId);

    socket.broadcast.to(tempShipmentId).emit("newDeletions", {
      tempShipmentId,
      imagePaths: tempShipment.shipmentImages,
      imageUrls: await Promise.all(
        tempShipment.shipmentImages.map(async (e) => {
          const data = await getCloudStorageObjectDownloadURL(e);
          return { url: data[0], type: data[1], path: e };
        })
      ),
    });
  };

  return {
    joinTemp,
    uploadDone,
    deleteUpload,
  };
};
