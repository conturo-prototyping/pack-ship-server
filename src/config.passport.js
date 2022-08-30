/**
 * Set up the Google OAuth 2.0 Strategy for logging in.
 */

const GoogleStrategy = require('passport-google-oauth2').Strategy;
const UserModel = require('./user/model');

const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, ALLOWED_LOGIN_DOMAIN,
} = process.env;

// eslint-disable-next-line func-names
module.exports = function (passport) {
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await UserModel.findOne({ _id: id, IsActive: true });
      if (!user) {
        done(null, null);
      } else {
        delete user.google.refreshToken;
        done(null, user);
      }
    } catch (e) {
      done(e);
    }
  });

  const clientID = GOOGLE_CLIENT_ID;
  const clientSecret = GOOGLE_CLIENT_SECRET;
  const callbackURL = GOOGLE_CALLBACK_URL;

  passport.use(new GoogleStrategy(
    // Credentials
    { clientID, clientSecret, callbackURL },

    // Google data
    (accessToken, refreshToken, profile, done) => process.nextTick(() => {
      // Reject logins outside our domain
      if (profile._json.domain !== ALLOWED_LOGIN_DOMAIN) {
        done(new Error(`You need a @${ALLOWED_LOGIN_DOMAIN} login to access this page.`));
      } else {
        const update = {
          $set: { 'google.accessToken': accessToken },
        };

        if (refreshToken) {
          update.$set['google.refreshToken'] = refreshToken;
        }

        UserModel.findOneAndUpdate(
          { 'google.id': profile.id },
          update,
          { returnNewDocument: true },
          // eslint-disable-next-line consistent-return
          (err, user) => {
            if (err) return done(err);
            if (user) return done(null, user);

            const newUser = new UserModel({
              UserName: profile.displayName,

              google: {
                accessToken,
                refreshToken,

                id: profile.id,
                email: profile.emails[0].value,
              },
            });

            newUser.save((ee) => {
              if (ee) throw ee;
              return done(null, newUser);
            });
          },
        );
      }
    }),
  ));
};
