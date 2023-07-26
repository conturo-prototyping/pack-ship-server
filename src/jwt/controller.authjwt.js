/**
 * Set up the JWT for temp logging in.
 */

const UserModel = require("../user/model");
const ExtractJwt = require("passport-jwt").ExtractJwt;
const JwtStrategy = require("passport-jwt").Strategy;

module.exports = function (passport) {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromHeader("authorization"),
        secretOrKey: process.env.JWT_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await UserModel.findOne({ _id: payload.id });
          if (!user) {
            done(null, null);
          } else {
            done(null, user);
          }
        } catch (e) {
          done(e);
        }
      }
    )
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    UserModel.findById(id, function (err, user) {
      done(err, user);
    });
  });
};
