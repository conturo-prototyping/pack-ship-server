const express = require('express');
const User = require('./model');
const router = express.Router();

module.exports = router;

router.get('/me', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id }).lean();
    res.send({ user });
  }
  catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});