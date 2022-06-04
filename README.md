[![Version](https://img.shields.io/npm/v/@adobe/aio-lib-ims.svg)](https://npmjs.org/package/@adobe/aio-lib-ims)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-lib-ims.svg)](https://npmjs.org/package/@adobe/aio-lib-ims)
[![Node.js CI](https://github.com/adobe/aio-lib-ims/actions/workflows/node.js.yml/badge.svg)](https://github.com/adobe/aio-lib-ims/actions/workflows/node.js.yml)[![License](https://img.shields.io/npm/l/@adobe/aio-lib-ims.svg)](https://github.com/adobe/aio-lib-ims/blob/master/package.json)
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
const { context, getToken, getTokenData } = require('@adobe/aio-lib-ims')

const config = {
  redirect_uri: "https://callback.example.org",
  client_id: "123456cafebabe",
  client_secret: "12345678-cafe-babe-cafe-9999",
  scope: "openid"
};
await context.set('example', config, true)

const token = await getToken('example')
const tokenDecoded = getTokenData(token)
```

See the [API Documentation](api.md) for full details.

# Configuration

The AIO IMS Library transparently maintains the login configuration and keep
access and refresh tokens for reuse before they expire.

All configuration is stored in a single `ims` root property.

The library supports maintaining multiple configurations for different use cases.
Each such configuration is stored in its own named object with the `ims` configuration.
Such a configuration is called an _IMS (configuration) context_ and has a label which allows to refer to the configuration by name.

Here is an example `ims` configuration

```js
{
  ims: {
    contexts: {
      sample_jwt: {
        client_id: "<jwt-clientid>",
        client_secret: "XXX",
        technical_account_id: "<guid>@techacct.adobe.com",
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
    }
  }
}
```

## Running on a Desktop

When running on your local machine the AIO IMS is leveraging the [Configuration module for use by aio-cli plugins](https://github.com/adobe/aio-lib-core-config) to load and update the configuration stored in `.aio` and `.env` files. The library supports both local and global aio configurations.

Here is an example that relies on the AIO IMS to generate a token from an existing configuration:

```js
const { context, getToken } = require('@adobe/aio-lib-ims')

await context.setCurrent('my-config')
const token = await getToken('my-config')
```

## Running in an Adobe I/O Runtime action

**Note that Adobe Developer App Builder applications should not own the responsibility to generate their own IMS access tokens.
We strongly discourage this approach in favor of more secure implementation patterns that are documented in our [App Builder Security Guide](https://developer.adobe.com/app-builder/docs/guides/security/#runtime-specific-guidelines).**

The AIO IMS Library can also be used in an Adobe I/O Runtime action. In this case the IMS configuration must be set beforehand. The library is relying on the [Adobe I/O Cloud State Library](https://github.com/adobe/aio-lib-state) to persist the access tokens across action invocations and reduce the number of requests to IMS.

Here is an Adobe I/O Runtime action example that leverages the AIO IMS:

```js
const { context, getToken } = require('@adobe/aio-lib-ims')

function main ({ imsContextConfig, ...params }) {
  // the IMS context configuration is passed as an action parameter
  // imsContextConfig = { client_id, client_secret, technical_account_id, meta_scopes, ims_org_id, private_key }
  await context.set('my_ctx', imsContextConfig)

  const token = await getToken('my_ctx')
}
```

Note that setting local=true in `context.set('my_ctx', imsContextConfig, true)` will not have any effect here.

Also note that internally tokens are cached for a single I/O Runtime action only, this means that cached tokens can't be retrieved across actions and running `getToken` in another action with the same context name will regenerate a new token. Instead, we recommend using a single I/O Runtime non-web action annotated with that is responsible for generating the token and passing it to other web actions, which then can use the token to integrate with one or several Adobe APIs. In this way, a single action generates the token, effectively (re-)using the cache.

## IMS Environment

The use of IMS environments is reserved to Adobe use.
For information it is indicated by the `env` configuration context property and takes one of the values `prod` and `stage`.
The default value is `prod`.
In general, you do not need to deal with this property.

## Set Current Context (Advanced)

The default context can be set locally with `await context.setCurrent('contextname')`. 
This will write the following configuration to the `ims` key in the `.aio` file of the current working directory:

```js
  ims {
    config: {
      current: "contextname"
    }
  }
```

If running the library in the same working directory, then `getToken` can be called without passing the `contextname`:

```js
await context.set('contextname', config, true)
await context.setCurrent('contextname')
const token = await getToken() // generate a token for the config in the 'contextname' context
```

**Please note that `context.setCurrent` rewrites the local configuration and replaces the default `aio` CLI OAuth configuration in a desktop environment.
This will break `aio` commands that run from the same directory.**
You can revert to the original behaviour by executing `aio config delete ims.config.current` from that directory.

## JWT Configuration

JWT (service to service integration) configuration requires the following properties:

| Property | Description |
|--|--|
| client_id | The IMS (Oauth2) Client ID. This is the _API Key_ in the integration overview of the Adobe I/O Console. |
| client_secret | The IMS (OAUth2) Client Secret |
| technical_account_id | The _Technical Account ID_ from the integration overview screen in the I/O Console
| meta_scopes | An array of meta scope names. These are the labels of one ore more special properties in the sample _JWT payload_. They can be found in the _JWT_ tab of the I/O Console integration in the _JWT payload_ properties of the form `"https://<ims-host>/s/ent_dataservices_sdk": true,`. There may be one or more of depending on the services to which the integration is subscribed. The values to list in the *meta_scopes* property are the last segment of the URL. In the example case, this would be `ent_dataservices_sdk`. |
| ims_org_id | The _Organization ID_ from the integration overview screen in the I/O Console. |
| private_key | The private key matching any one of the _Public Keys_ of the integration. This can be the private key all in one line as a string, or an array of strings (each element is a line from the key file) See the [Setting the Private Key](#setting-the-private-key) section. |
| passphrase | (_Optional_). The passphrase of the private key. |


## Setting the Private Key

For a JWT configuration, your private key is generated in Adobe I/O Console, and is downloaded to your computer when you generate it. 

Adobe I/O Console does not keep the private key (only your corresponding public key) so you will have to set the private key that was downloaded manually in your IMS context configuration.

You can set your private key in the config via two ways:
1. Import the private key as a string
2. Set a file reference to the private key

The instructions below assume a private key file called `private.key` and `CONTEXT_NAME` is the name of your JWT context.

1. To import your private key as a string:

`aio config:set ims.contexts.CONTEXT_NAME.private_key path/to/your/private.key --file`

2. To set a file reference to the private key instead:

`aio config:set ims.contexts.CONTEXT_NAME.private_key path/to/your/private.key`

Note that the path to your private key, if it is a relative path, will be resolved relative to the current working directory.

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
