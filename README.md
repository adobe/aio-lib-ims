[![Version](https://img.shields.io/npm/v/@adobe/aio-lib-ims.svg)](https://npmjs.org/package/@adobe/aio-lib-ims)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-lib-ims.svg)](https://npmjs.org/package/@adobe/aio-lib-ims)
[![Build Status](https://travis-ci.com/adobe/aio-lib-ims.svg?branch=master)](https://travis-ci.com/adobe/aio-lib-ims)
[![License](https://img.shields.io/npm/l/@adobe/aio-lib-ims.svg)](https://github.com/adobe/aio-lib-ims/blob/master/package.json)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-lib-ims/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-lib-ims/) 


# Adobe I/O IMS Library

The Adobe I/O IMS Library helps interacting with the IMS API as well as creating and invalidating tokens.
To support multiple use cases and environments, there is not a single configuration managed by this library but multiple configurations called _IMS configuration contexts_.
Each configuration context holds configuration data needed to create tokens.
See the _Configuration_ section below.

# Installation

To install the Adobe I/O IMS Library, simple use `npm`:

```sh
$ npm install @adobe/aio-lib-ims --save
```

# Quickstart

Before using the AIO IMS Library you need to create an integration on Adobe I/O Console from where you can the grab the integration details to setup a first configuration context. Let's use an OAuth2 integration as an example:

```js
const { context, getToken, getTokenData } = require('@adobe/aio-lib-ims');

const config = {
  redirect_uri: "https://callback.example.org",
  client_id: "123456cafebabe",
  client_secret: "12345678-cafe-babe-cafe-9999",
  scope: "openid"
};
await context.set('example', config, true);
await context.setCurrent('example');

const token = await getToken();
const tokenDecoded = getTokenData(token);
```

See the [API Documentation](api.md) for full details.

# Configuration

The AIO IMS Library transparently maintains the login configuration and keep
access and refresh tokens for reuse before they expire.

All configuration is stored in a single `ims` root property.

The library supports maintaining multiple configurations for different use cases.
Each such configuration is stored in its own named object with the `ims` configuration.
Such a configuration is called an _IMS (configuration) context_ and has a label which allows to refer to the configuration by name.

Inside the `ims` configuration object, the name of the _current context_ is stored in the `config.current` property.

Here is an example `ims` configuration

```js
{
  ims: {
    contexts: {
      sample_jwt: {
        client_id: "<jwt-clientid>",
        client_secret: "XXX",
        technical_account_id: "<guid>@techacct.adobe.com",
        technical_account_email: "<another_guid>@techacct.adobe.com",
        meta_scopes: [
          "ent_dataservices_sdk"
        ],
        ims_org_id: "<org-guid>@AdobeOrg",
        private_key: "XXX"
      },
      sample_oauth2: {
        redirect_uri: "https://callback.example.com",
        client_id: "<oauth2-clientid>",
        client_secret: "XXX",
        scope: "openid AdobeID"
      },
    },
    config: {
      current: "sample_oauth2",
      plugins: [
        "sample-aio-lib-ims-plugin"
      ]
    }
  }
}
```

## Running on a Desktop

When running on your local machine the AIO IMS is leveraging the [Configuration module for use by aio-cli plugins](https://github.com/adobe/aio-lib-core-config) to load and update the configuration stored in `.aio` and `.env` files. The library supports both local and global aio configurations.

Here is an example that relies on the AIO IMS to generate a token from an existing configuration:

```js
const { context, getToken } = require('@adobe/aio-lib-ims');

await context.setCurrent('my-config');
const token = await getToken();
```

## Running in an Adobe I/O Runtime action

**Note that Project Firefly applications should not own the responsibility to generate their own IMS access tokens.
We strongly discourage this approach in favor of more secure implementation patterns that are documented in our [Project Firefly Security Guide](https://github.com/AdobeDocs/project-firefly/blob/master/guides/security_overview.md).**

The AIO IMS Library can also be used in an Adobe I/O Runtime action. In this case the IMS configuration must be set beforehand. The library is relying on the [Adobe I/O Cloud State Library](https://github.com/adobe/aio-lib-state) to persist the access tokens across action invocations and reduce the number of requests to IMS.

Here is an Adobe I/O Runtime action example that leverages the AIO IMS:

```js
const { context, getToken } = require('@adobe/aio-lib-ims');

function main ({ imsContextConfig, ...params }) {
  // the IMS context configuration is passed as an action parameter
  // imsContextConfig = { client_id, client_secret, technical_account_id, technical_account_email, meta_scopes, ims_org_id, private_key }
  await context.set('my_ctx', imsContextConfig)

  const token = await getToken('my_ctx')
}
```

Note that for now cached tokens will only be accessible from the action that created them. In
the above example, the token persisted under `'my_ctx'` will not be retrievable from a
different action even if it uses the same context key.

## IMS Environment

The use of IMS environments is reserved to Adobe use.
For information it is indicated by the `env` configuration context property and takes one of the values `prod` and `stage`.
The default value is `prod`.
In general, you do not need to deal with this property.

## JWT Configuration

JWT (service to service integration) configuration requires the following properties:

| Property | Description |
|--|--|
| client_id | The IMS (Oauth2) Client ID. This is the _API Key_ in the integration overview of the Adobe I/O Console. |
| client_secret | The IMS (OAUth2) Client Secret |
| technical_account_id | The _Technical Account ID_ from the integration overview screen in the I/O Console
| technical_account_email | The _Technical Account Email_ from the integration overview screen in the I/O Console
| meta_scopes | An array of meta scope names. These are the labels of one ore more special properties in the sample _JWT payload_. They can be found in the _JWT_ tab of the I/O Console integration in the _JWT payload_ properties of the form `"https://<ims-host>/s/ent_dataservices_sdk": true,`. There may be one or more of depending on the services to which the integration is subscribed. The values to list in the *meta_scopes* property are the last segment of the URL. In the example case, this would be `ent_dataservices_sdk`. |
| ims_org_id | The _Organization ID_ from the integration overview screen in the I/O Console. |
| private_key | The private key matching any one of the _Public Keys_ of the integration. This can be the private key all in one line as a string, or an array of strings (each element is a line from the key file)  |
| passphrase | (_Optional_). The passphrase of the private key. |


## OAuth2 Configuration

OAuth2 configuration requires the following properties:

| Property | Description |
|--|--|
| client_id | The IMS (Oauth2) Client ID. This is the _API Key_ in the integration overview of the Adobe I/O Console. |
| client_secret | The IMS (OAUth2) Client Secret |
| redirect_uri | The _Default redirect URI_ from the integration overview screen in the I/O Console. Alternatively, any URI matching one of the _Redirect URI patterns_ may be used. |
| scope | Scopes to assign to the tokens. This is a string of space separated scope names which depends on the services this integration is subscribed to. Adobe I/O Console does not currently expose the list of scopes defined for OAuth2 integrations, a good list of scopes by service can be found in [OAuth 2.0 Scopes](https://www.adobe.io/authentication/auth-methods.html#!AdobeDocs/adobeio-auth/master/OAuth/Scopes.md). At the very least you may want to enter `openid`. |

# Contributing
Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.


# Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
