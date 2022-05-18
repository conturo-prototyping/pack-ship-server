## Pack-Ship Server
Backend code for packing & shipping module.

For the time being this is meant to be loaded via an iframe from the ShopQ project's shipping page.

### Required env vars
* Database
  - MONGO_DB_URI
* Google OAuth 2.0 (If you need to set up a new project for these, do so from https://console.developers.google.com/)
  - `GOOGLE_CLIENT_ID` Project public key
  - `GOOGLE_CLIENT_SECRET` Project secret key
  - `GOOGLE_CALLBACK_URL` Server endpoint to hit after successful google OAuth
  - `LOGIN_FAILURE_REDIRECT` URL to redirect browser to upon login success
  - `LOGIN_SUCCESS_REDIRECT` URL to redirect brwoser to upon login failure
  - `ALLOWED_LOGIN_DOMAIN` The web domain that is allowed access (e.g. 'conturoprototyping.com')
* CORS Allowed Origin
  - `CORS_CLIENT_URL` Allowed origin domain (e.g. 'http://localhost:3001')
* Session Cookie
  - `SESSION_NAME` Cookie name
  - `SESSION_SECRET` Cookie secret string
* Error logging (Only required if `NO_EMAIL` != 1)
  - `ERRORS_ADDR` Email address to send error logs to
  - `MAILER_ADDR` Email address to send error logs from (gmail)
  - `MAILER_PASS` Password for `MAILER_ARR` accounts

### Optional env vars
* Debugging
  - `PORT` Default is 3000
  - `NODE_ENV` Use 'DEBUG' to use debug routes
  - `NO_EMAIL` Set to 1 to console log errors instead of emailing
  - `NO_EMAIL_LOG` Set to 1 to suppress console logs of deferred emails

## Required Context Setup
* Set up a project in Google Cloud Platform with the following APIs
  - Google Drive API
  - People API
* Add Credentials for Web Application withe:
  - Authorized JavaScript origins: 'http://localhost:3000' (or whatever PORT you are using)
  - Authorized redirect URIs 'http://localhost:3000/auth/google/callback'
* Get the Client ID & Client Secret from this set of credentials and use them to set your env vars.
* Make sure the project is setup as an Internal app.
* To create dummy data use `POST /debug/reset`