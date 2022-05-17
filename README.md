## Pack-Ship Server
Backend code for packing & shipping module.

For the time being this is meant to be loaded via an iframe from the ShopQ project's shipping page.

## Required env vars
* Database
  - MONGO_DB_URI
* Google OAuth 2.0 (If you need to set up a new project for these, do so from https://console.developers.google.com/)
  - `GOOGLE_CLIENT_ID` Project public key
  - `GOOGLE_CLIENT_SECRET` Project secret key
  - `GOOGLE_CALLBACK_URL` Server endpoint to hit after successful google OAuth
  - `LOGIN_FAILURE_REDIRECT` URL to redirect browser to upon login success
  - `LOGIN_SUCCESS_REDIRECT` URL to redirect brwoser to upon login failure
  - `ALLOWED_LOGIN_DOMAIN` The web domain that is allowed access
* CORS Allowed Origin
  - `CORS_CLIENT_URL` Allowed origin domain
* Session Cookie
  - `SESSION_NAME` Cookie name
  - `SESSION_SECRET` Cookie secret string