const express = require('express');
const { LogError } = require('../utils');
const User = require('./model');
const router = express.Router();

module.exports = {
  router,
  BlockNonAdmin
};

/**
 * Quick middleware to block non-admins from proceeding.
 */
function BlockNonAdmin(req, res, next) {
  try {
    const { Groups } = req.user;

    if (!Groups) return res.status(500).send('You do not belong to any groups.');
    if (!Groups.includes('ADMIN')) return res.status(403).send('You do not have permission to do that.');

    next();
  }
  catch (e) {
    LogError(e);
    res.status(500).send(e);
  }
}

router.get('/me', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id, IsActive: true }).lean();
    res.send({ user });
  }
  catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});