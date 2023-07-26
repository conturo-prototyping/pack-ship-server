const { Router } = require("express");
const jwt = require("jsonwebtoken");
const UserModel = require("../user/model");

const router = Router();

module.exports = {
  router,
  generateJWT,
};

async function generateJWT(userId) {
  const user = await UserModel.findOne({ _id: userId, IsActive: true });

  if (!user) {
    throw "Cannot generate JWT because user does not exist and is not active.";
  }

  const token = jwt.sign(
    {
      user: { email: user.google.email, username: user.UserName },
      id: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1 hour",
    }
  );

  return token;
}
