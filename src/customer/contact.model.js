/**
 * Trimmed down schema for ShopQ- Client Contact
 * Added here b/c interfacing with ShopQ's current private API is too much of a hassle
 */

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: String,
  address: {
    line1: String,
    line2: String,
    line3: String,
    line4: String,
  },
});

module.exports = mongoose.model('oldContact', schema, 'oldContact-v1');
