const express = require('express');
const { UserModel } = require('./model');

const router = express.Router();

module.exports = router;

router.get('/me', async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.user._id, IsActive: true }).lean();
    res.send({ user });
  } catch (e) {
    console.error(e);
    res.status(500).send(e);
  }
});
