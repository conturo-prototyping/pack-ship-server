module.exports = (io) => {
  const joinTemp = function (payload) {
    const socket = this;
    socket.join(payload.tempShipmentId);
  };

  const uploadDone = function (payload) {
    const socket = this;

    const tempShipmentId = payload.tempShipmentId;

    socket.to(tempShipmentId).emit("newUploads", { tempShipmentId });
  };

  return {
    joinTemp,
    uploadDone,
  };
};
