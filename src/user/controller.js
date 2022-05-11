const express = require('express');
const { findOne } = require('./model');
const router = express.Router();

router.get('/me', async (req, res) => {
  try {
    const user = findOne({ _id: req.user._id }).lean();
    res.send({ user });
  }
  catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});