# Adobe I/O - IMS Tests

## Requirements

To run the e2e test you'll need these env variables set:
  1. `IMS_CLIENT_ID`
  2. `IMS_CLIENT_SECRET`
  3. `IMS_SCOPES`
  4. `IMS_ORG_ID`
  5. `IMS_ENV='prod|stage'`

## Run

`npm run e2e`

## Test overview

The tests connect to Adobe IMS, and cover token exchange (via supplied signed JWT), validation, invalidation.
