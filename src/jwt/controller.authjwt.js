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
      (payload, done) => {
        UserModel.findById(payload.id, (err, user) => {
          if (err) {
            return done(err, false);
          }
          if (user) {
            return done(null, user);
          } else {
            return done(null, false);
          }
        });
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
