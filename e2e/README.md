# Adobe I/O - IMS Tests

## Requirements

To run the e2e test you'll need these env variables set:
  1. IMS_CLIENT_ID,
  2. IMS_CLIENT_SECRET,
  3. IMS_SIGNED_JWT

## Run

`npm run e2e`

## Test overview

The tests connect to Adobe IMS, and cover token exchange (via supplied signed JWT), validation, invalidation.

