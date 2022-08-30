/**
 * Trimmed down schema for ShopQ- GenOrder-v2
 * This was added here b/c interfacing with ShopQs private API via cors was too much of a hassle.
 */

const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;
require('../customer/contact.model'); // just load it so schema is registered

const schema = new mongoose.Schema({
  orderNumber: String,

  content: {
    billing: {
      purchaseOrderNumber: String,
    },

    shipping: {
      shippingContact: {
        type: ObjectId,
        ref: 'oldContact',
      },
    },
  },
});

module.exports = mongoose.model('genOrder-v2', schema, 'genOrders-v2');
