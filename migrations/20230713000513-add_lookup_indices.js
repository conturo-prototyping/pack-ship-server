module.exports = {
  async up(db, client) {
    await db.collection("workorders").createIndex({ "Items._id": 1 });
    await db.collection("workorders").createIndex({ OrderNumber: 1 });

    await db.collection("shipments").createIndex({ isPastVersion: 1 });

    await db.collection("packingSlips").createIndex({ "Items._id": 1 });
    await db.collection("packingSlips").createIndex({ "Items.item": 1 });

    await db.collection("genOrders-v2").createIndex({ "content.items._id": 1 });
    await db.collection("genOrders-v2").createIndex({ orderNumber: 1 });
  },

  async down(db, client) {
    await db.collection("workorders").dropIndex({ "Items._id": 1 });
    await db.collection("workorders").dropIndex({ OrderNumber: 1 });

    await db.collection("shipments").dropIndex({ isPastVersion: 1 });

    await db.collection("packingSlips").dropIndex({ "Items._id": 1 });
    await db.collection("packingSlips").dropIndex({ "Items.item": 1 });

    await db.collection("genOrders-v2").dropIndex({ "content.items._id": 1 });
    await db.collection("genOrders-v2").dropIndex({ orderNumber: 1 });
  },
};
