# Adobe I/O CNA IMS Library

[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/aio-cna-core-ims.svg?token=b2cddca43fa697ddb206faaa410c01addcad20154ed371ddd7a4fbeeef2474bc&ts=1567277064673)](https://greenkeeper.io/)

The Adobe I/O CNA IMS Library helps interacting with the IMS API as well as creating and invalidating tokes.
To support multiple use cases and environments, there is not a single configuration managed by this library but multiple configurations called _IMS configuration contexts_.
Each configuration context holds configuration data needed to create tokens.
See the _Configuration_ section below.

# Installation

To install the Adobe I/O CNA IMS Library, simple use `npm`:

```sh
$ npm install @adobe/aio-cna-core-ims --save
```

# Quickstart

Before using the CNA IMS Library you need to create an integration on Adobe I/O Console from where you can the grab the integration details to setup a first configuration context. Let's use an OAuth2 integration as an example:

```js
const { context, getToken } = require('@adobe/aio-cna-core-ims');

const config = {
  callback_url: "https://callback.example.org",
  client_id: "123456cafebabe",
  client_secret: "12345678-cafe-babe-cafe-9999",
  scope: "openid"
};
context.set('example', config, true);
context.current = 'example';

const token = getToken();
const tokenDecoded = getTokenData(token);
```

See the [API Documentation](api.md) for full details.

# Configuration

The CNA IMS Library is leveraging the [Configuration module for use by aio-cli plugins](https://github.com/adobe/aio-cna-core-config) to maintain the login configuration and keep access and refresh tokens for reuse before they expire.

All configuration is stored in a single semi-hidden `$ims` root property.

The plugin supports maintaining multiple configurations for different use cases.
Each such configuration is stored in its own named object with the `$ims` configuration.
Such a configuration is called an _IMS (configuration) context_ and has a label which allows to refer to the configuration by name.

To simplify usage, there may be a designated _current context_ which is always used if explicit context is not given to the command.
Inside the `$ims` configuration object, the name of the _current context_ is stored in the `$current` property.

Here is an example `$ims` configuration

```js
{
  $ims: {
    sample_jwt: {
      client_id: "<jwt-clientid>",
      client_secret: "XXX",
      techacct: "<guid>@techacct.adobe.com",
      meta_scopes: [
        "ent_dataservices_sdk"
      ],
      ims_org_id: "<org-guid>@AdobeOrg",
      private_key: "XXX"
    },
    sample_oauth2: {
      callback_url: "https://callback.example.com",
      client_id: "<oauth2-clientid>",
      client_secret: "XXX",
      scope: "openid AdobeID"
    },
    $current: "sample_oauth2",
    $plugins: [
      "sample-cna-ims-plugin"
    ]
  }
}
```

This configuration lists two _configuration contexts_ `sample_jwt` and `sample_oauth2` designating the `sample_oauth2` configuration to be the current context.

## IMS Environment

The use of IMS environments is reserved to Adobe use.
For information it is indicated by the `env` configuration context property and takes one of the values `prod` and `stage`.
The default value is `prod`.
This property does not in general to be dealt with.

## JWT Configuration

JWT (service to service integration) configuration requires the following properties:

| Property | Description |
|--|--|
| client_id | The IMS (Oauth2) Client ID. This is the _API Key_ in the integration overview of the Adobe I/O Console. |
| client_secret | The IMS (OAUth2) Client Secret |
| techacct | The _Technical Account ID_ from the integration overview screen in the I/O Console
| meta_scopes | An array of meta scope names. These are the labels of one ore more special properties in the sample _JWT payload_. They can be found in the _JWT_ tab of the I/O Console integration in the _JWT payload_ properties of the form `"https://<ims-host>/s/ent_dataservices_sdk": true,`. There may be one or more of depending on the services to which the integration is subscribed. The values to list in the *meta_scopes* property are the last segment of the URL. In the example case, this would be `ent_dataservices_sdk`. |
| ims_org_id | The _Organization ID_ from the integration overview screen in the I/O Console. |
| private_key | The private key matching any one of the _Public keys_ of the integration. |


## OAuth2 Configuration

OAuth2 configuration requires the following properties:

| Property | Description |
|--|--|
| client_id | The IMS (Oauth2) Client ID. This is the _API Key_ in the integration overview of the Adobe I/O Console. |
| client_secret | The IMS (OAUth2) Client Secret |
| callback_url| The _Default redirect URI_ from the integration overview screen in the I/O Console. Alternatively, any URI matching one of the _Redirect URI patterns_ may be used. |
| scope | Scopes to assign to the tokens. This is a string of space separated scope names which depends on the services this integration is subscribed to. Adobe I/O Console does not currently expose the list of scopes defined for OAuth2 integrations, a good list of scopes by service can be found in [OAuth 2.0 Scopes](https://www.adobe.io/authentication/auth-methods.html#!AdobeDocs/adobeio-auth/master/OAuth/Scopes.md). At the very least you may want to enter `openid`. |


## Adding Configuration Support

The CNA IMS Library handles common tasks around tokens by itself.
This includes storing access and refresh tokens in the configuration context, checking those tokens for expiry, and refreshing as needed.
Only when an access token (and a refresh token) needs to be created anew from the configuration context credentials, the plugins come into play.

When a new access token needs to be created from credentials, the IMS Library implements the following algorithm:

* Collect the CNA IMS Library plugins
* Iterate over this collection and for each plugin do:
  * `require` the plugin
  * Call the plugin's `supports(config)` function with the configuration context
  * If `supports(config)` returns `true` then call the plugin's `imsLogin(ims, config, force)` function with an instance of the [`Ims`](/adobe/aio-cna-core-ims/blob/master/src/ims.js) class, the configuration context, and a boolean flag described below in [Forced `imsLogin`](#forced-imslogin).

From this algorithm we can derive the following requirements for a plugin:

* _MUST_ be installed and available to the `require` function of the CNA IMS Library.
* _MUST_ set the script to be loaded by `requiring` the plugin's root folder in the `package.json#/main` property (this is actually how `require` loads the package's main script when using the folder containing the `package.json` file).
* _MUST_ export an object from this script with the following two properties being functions:

    | Property | Signature | Description |
    |---|---|---|
    | `supports` | `(config) => boolean` | Given the IMS configuration context, returns `true` if the configuration can be used for the plugins login mechanism. |
    | `imsLogin` | `(ims, config, force) => Promise` | Given the [`Ims` instance](/adobe/aio-cna-core-ims/blob/master/src/ims.js) and the IMS configuration context implement the authentication with IMS and return a `Promise` resolving to a token object. See [Forced `imsLogin`](#forced-imslogin) for details on the `force` parameter. |

### Forced `imsLogin`

Some plugins support an OAuth2 login mechanism where the actual account for which an access token is generated depends on the user input.
For example the [OAuth2](/adobe/aio-cna-core-ims-oauth) plugin implements an ExpressJS application to implemented the three legeed OAuth2 flow.
During this flow the user is entering their credentials for IMS to validate.

Typically IMS will set some cookies to cache the login state in the browser to improve user experience in a standard OAUth2 web application.
In CLI contexts it might not always be desired to always get a token for the same user, particularly in testing scenarios.

To allow changing user identity in the OAuth2 plugin or to prevent reusing cached information, the `force` flag to the `imsLogin` function indicates whether to clean caches before logging in.
`True` meaning to clean the cache, while `false` indicates that using cached information is just fine.

### `imsLogin` Promise

The promise returned form `imsLogin` must resolve to a _token object_ having the following general structure:

```js
{
  access_token: {
    token: <token-value>,
    expiry: <token-expiry-time-in-ms-since-epoch>
  },
  refresh_token: {
    token: <token-value>,
    expiry: <token-expiry-time-in-ms-since-epoch>
  },
  ...<more properties>...
}
```

The `access_token` object containing the `token` value and `expiry` time is required and login will fail if this property is missing.
The `refresh_token` is optional and may not always be present.
Any additional properties are currently ignored.

The `Ims.exchangeJwtToken()` and `Ims.getAccessToken()` functions both return a `Promise` resolving to a _token object_ as expected to be returned from the `imsLogin` function.

### Implementing Plugins

Since plugins are accessed using standard `require` , one `npm` package only provides exactly one IMS plugin extension.
Multiple plugins must be implemented in separate plugins.
The configuration support modules for [JWT](/adobe/aio-cna-core-ims-jwt) and [OAuth2](/adobe/aio-cna-core-ims-oauth) are two such packages.
The IMS Library has a dependency on the _JWT_ and _OAuth2_ plugins and will always try to use those.

Additional plugins must be `npm install`-ed and listed in the `$ims/$plugins` array property.
This can easily be done in the package `postinstall` script like this:

```js
const { context } = require('@adobe/aio-cna-core-ims');
context.plugins = context.plugins.push(process.env.npm_package_name);
```

**NOTE:** You want to actually be a bit more intelligent and first check, whether the plugin is already listed and you might also want to provide a `preuninstall` script to remove the plugin from the list again when being uninstalled.


# Contributing
Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.


# Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.