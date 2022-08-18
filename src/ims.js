/*
Copyright 2018 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const FormData = require('form-data')
const { HttpExponentialBackoff } = require('@adobe/aio-lib-core-networking')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-ims:ims', { provider: 'debug' })
const url = require('url')
const { getCliEnv, DEFAULT_ENV } = require('@adobe/aio-lib-env')
const { codes: errors } = require('./errors')

const IMS_ENDPOINTS = {
  stage: 'https://ims-na1-stg1.adobelogin.com',
  prod: 'https://ims-na1.adobelogin.com'
}

/** The constant string `access_token`.  */
const ACCESS_TOKEN = 'access_token'

/** The constant string `refresh_token`.  */
const REFRESH_TOKEN = 'refresh_token'

/** The constant string `authorization_code`.  */
const AUTHORIZATION_CODE = 'authorization_code'

/** The constant string `client_id`.  */
const CLIENT_ID = 'client_id'

/** The constant string `client_secret`.  */
const CLIENT_SECRET = 'client_secret'

/** The constant string `scope`.  */
const SCOPE = 'scope'

/**
 * Send the request.
 *
 * @private
 * @param {string} method the http method
 * @param {string} url the url endpoint
 * @param {string} token the access token authorization
 * @param {object} data the data to send
 * @returns {Promise} Promise that resolves with the request data
 */
async function _sendRequest (method, url, token, data) {
  const requestOptions = {
    method,
    headers: {
      'User-Agent': 'aio-cli-ims'
    }
  }

  if (method === 'POST') {
    let formData = data
    if (!(formData instanceof FormData)) {
      formData = Object.keys(data).reduce((formData, key) => {
        formData.append(key, data[key])
        return formData
      }, new FormData())
    }
    requestOptions.body = formData
  }

  if (token) {
    requestOptions.headers.Authorization = `Bearer ${token}`
  }

  const retryOptions = { maxRetries: 3, initialDelayInMillis: 500 }

  const validateResponse = (res) => {
    if (res.status === 200) {
      return res
    }
    throw (new Error(`${res.status} (${res.statusText})`))
  }

  const handleTextResponse = (text) => {
    try {
      return JSON.parse(text)
    } catch (e) {
      return text
    }
  }

  const fetchRetry = new HttpExponentialBackoff()
  return fetchRetry.exponentialBackoff(url, requestOptions, retryOptions)
    .then(validateResponse)
    .then((res) => res.text())
    .then(handleTextResponse)
}

/**
 * Send a request via GET.
 *
 * @private
 * @param {string} getUrl the url endpoint
 * @param {string} token the authorization token
 * @param {object} getData the data to send
 * @returns {Promise} Promise that resolves with the request data
 */
async function _sendGet (getUrl, token, getData) {
  return _sendRequest('GET', getUrl, token, getData)
}

/**
 * Send a request via POST.
 *
 * @param {string} postUrl the url endpoint
 * @param {string} token the authorization token
 * @param {object} postData the data to send
 * @returns {Promise} Promise that resolves with the request data
 */
async function _sendPost (postUrl, token, postData) {
  return _sendRequest('POST', postUrl, token, postData)
}

/**
 * Calculate the expiry date for a token.
 *
 * @private
 * @param {string} token the access token
 * @returns {number} the expiry date
 */
function _calculateExpiry (token) {
  // Note: could use jwt library, but this is simpler and slicker
  const data = getTokenData(token)
  return parseInt(data.created_at) + parseInt(data.expires_in)
}

/**
 * Get the type of a token.
 *
 * @private
 * @param {string} token the access token
 * @returns {string} the type of the token
 */
function _getTokenType (token) {
  return getTokenData(token).type
}

/**
 * Converts the `apiResponse` in such a was as to extract the access
 * token and the refresh token (if available) to the top level and
 * setting expiry times as follows:
 *
 * ```json
 * {
 * "access_token": {
 * "token": <access_token>,
 * "expiry": <expiry-time-in-ms-since-epoch>
 * },
 * "refresh_token": {
 * "token": >refresh_token>,
 * "expiry": <expiry-time-in-ms-since-epoch>
 * },
 * "payload": {
 * <full-response>
 * }
 * }
 * ```
 *
 * @private
 * @param {object} apiResponse the api response data
 * @returns {object} the result data
 */
async function _toTokenResult (apiResponse) {
  aioLogger.debug('toTokenResult(%o)', apiResponse)
  const result = {
    payload: apiResponse
  }

  for (const label of [ACCESS_TOKEN, REFRESH_TOKEN]) {
    aioLogger.debug(' > %s', label)
    const token = apiResponse[label]
    aioLogger.debug(' > %o', token)
    if (token) {
      result[label] = {
        token,
        expiry: _calculateExpiry(token)
      }
      aioLogger.debug(' > %o', result[label])
    }
  }

  aioLogger.debug('<< %o', result)
  return result
}

/**
 * Returns the decoded token value as JavaScript object.
 *
 * @param {string} token The token to decode and extract the token value from
 * @returns {object} The decoded token payload data without header and signature
 */
function getTokenData (token) {
  const [, payload] = token.split('.', 3)
  return JSON.parse(Buffer.from(payload, 'base64'))
}

/**
 * The `Ims` class wraps the IMS API.
 */
class Ims {
  /**
   * Creates a new IMS connector instance for the stage or prod environment
   *
   * @param {string} env The name of the environment. `prod` and `stage`
   *      are the only values supported. `prod` is default and any value
   *      other than `prod` or `stage` it is assumed to be the default
   *      value of `prod`. If not set, it will get the global cli env value. See https://github.com/adobe/aio-lib-env
   *      (which defaults to `prod` as well if not set)
   */
  constructor (env = getCliEnv()) {
    this.endpoint = IMS_ENDPOINTS[env] || IMS_ENDPOINTS[DEFAULT_ENV]
  }

  /**
   * Returns the absolute URL to call the indicated API.
   * The API is expected to be the API absolute path, such as `/ims/profile`.
   * To form the absolute URL, the scheme (`https`) and fully qualified
   * domain of the IMS host for this instance's environment is prepended
   * to the path.
   *
   * @param {string} api The API (path) for which to return the URL
   * @returns {string} The absolute URI for the IMS API
   */
  getApiUrl (api) {
    return this.endpoint + api
  }

  /**
   * Returns the URL for the environment of this instance which allows
   * for OAuth2 based three-legged authentication with a browser for
   * an end user.
   *
   * @param {string} clientId The Client ID
   * @param {string} scopes The list of scopes to request as a blank separated list
   * @param {string} callbackUrl The callback URL after the user signed in
   * @param {string} state Any state value which is passed back from sign in
   * @returns {string} the OAuth2 login URL
   */
  getSusiUrl (clientId, scopes, callbackUrl, state) {
    aioLogger.debug('getSusiUrl(%s, %s, %s, %s)', clientId, scopes, callbackUrl, state)

    const app = new url.URL(this.getApiUrl('/ims/authorize/v1'))
    app.searchParams.set('response_type', 'code')
    app.searchParams.set(CLIENT_ID, clientId)
    app.searchParams.set(SCOPE, scopes)
    app.searchParams.set('redirect_uri', callbackUrl)
    app.searchParams.set('state', state)
    return app.toString()
  }

  /**
   * Send a `GET` request to an IMS API with the access token sending
   * the `parameters` as request URL parameters.
   *
   * @param {string} api The IMS API to `GET` from, e.g. `/ims/profile/v1`
   * @param {string} token The IMS access token to call the API
   * @param {Map} parameters A map of request parameters
   * @returns {Promise} a promise resolving to the result of the request
   */
  async get (api, token, parameters) {
    aioLogger.debug('get(%s, %s, %o)', api, token, parameters)

    return _sendGet(this.getApiUrl(api), token, parameters)
  }

  /**
   * Send a `POST` request to an IMS API with the access token sending
   * the `parameters` as form data.
   *
   * @param {string} api The IMS API to `POST` to, e.g. `/ims/profile/v1`
   * @param {string} token The IMS access token to call the API
   * @param {Map} parameters A map of request parameters
   * @returns {Promise} a promise resolving to the result of the request
   */
  async post (api, token, parameters) {
    aioLogger.debug('post(%s, %s, %o)', api, token, parameters)

    return _sendPost(this.getApiUrl(api), token, parameters)
  }

  /**
   * Request the access token for the given client providing the access
   * grant in the `authCode`.
   * The promise resolve to the token result JavaScript object as follows:
   *
   * ```js
   * {
   *   access_token: {
   *     token: "eyJ4NXUiOi...6ZodTesbag",
   *     expiry: 1566242851048
   *   },
   *   refresh_token: {
   *     token: "eyJ4NXUiOi...YbT1_szWZA",
   *     expiry: 1567366051050
   *   },
   *   payload: {
   *      ...full api response...
   *   }
   * }
   * ```
   *
   * @param {string} authCode The authorization code received from the OAuth2
   *      sign in page or by some other means. This may also be a refresh
   *      token which may be traded for a new access token.
   * @param {string} clientId The Client ID
   * @param {string} clientSecret The Client Secrete proving client ID ownership
   * @param {string} scopes The list of scopes to request as a blank separated list
   * @returns {Promise} a promise resolving to a tokens object as described in the
   *      {@link toTokenResult} or rejects to an error message.
   */
  async getAccessToken (authCode, clientId, clientSecret, scopes) {
    aioLogger.debug('getAccessToken(%s, %s, %s, %o)', authCode, clientId, clientSecret, scopes)

    // prepare the data with common data
    const postData = {
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes
    }

    // complete data with authCode specific grant type and property
    const tokenType = _getTokenType(authCode)
    if (tokenType === AUTHORIZATION_CODE) {
      // for service tokens this is the static authCode
      // for OAuth Tokerns this is the code received from the redirect
      postData.grant_type = AUTHORIZATION_CODE
      postData.code = authCode
    } else if (tokenType === REFRESH_TOKEN) {
      // for refresh tokens
      postData.grant_type = REFRESH_TOKEN
      postData.refresh_token = authCode
    } else {
      return Promise.reject(new errors.UNKNOWN_AUTHCODE_TYPE({ messageValues: tokenType }))
    }

    return _sendPost(this.getApiUrl('/ims/token/v1'), undefined, postData)
      .then(_toTokenResult)
  }

  /**
   * Asks for the signed JWT token to be exchanged for a valid access
   * token as well as a refresh token.
   * The promise resolve to the token result JavaScript object as follows:
   *
   * ```js
   * {
   *   access_token: {
   *     token: "eyJ4NXUiOi...6ZodTesbag",
   *     expiry: 1566242851048
   *   },
   *   payload: {
   *      ...full api response...
   *   }
   * }
   * ```
   *
   * Note that there is no `refresh_token` in a JWT token exchange.
   *
   * @param {string} clientId The client ID of the owning application
   * @param {string} clientSecret The client's secret
   * @param {string} signedJwtToken The properly signed JWT token for the JWT token exchange
   * @returns {Promise} returns a Promise that resolves to the token result object
   */
  async exchangeJwtToken (clientId, clientSecret, signedJwtToken) {
    aioLogger.debug('exchangeJwtToken(%s, %s, %s)', clientId, clientSecret, signedJwtToken)

    const postData = {
      client_id: clientId,
      client_secret: clientSecret,
      jwt_token: signedJwtToken
    }

    const postURL = this.getApiUrl('/ims/exchange/jwt')

    return _sendPost(postURL, undefined, postData).then(_toTokenResult)
  }

  /**
   * Invalidates the given token. If the token is a refresh token, all the
   * access tokens created with that refresh token will also be invalidated
   * at the same time.
   *
   * @param {string} token the access token
   * @param {string} clientId the client id
   * @param {string} clientSecret the client secret
   * @returns {Promise} Promise that resolves with the request data
   */
  async invalidateToken (token, clientId, clientSecret) {
    aioLogger.debug('invalidateToken(%s, %s, %s)', token, clientId, clientSecret)
    if (clientId && clientSecret) {
      const postData = {
        token_type: _getTokenType(token),
        token,
        cascading: 'all',
        client_id: clientId,
        client_secret: clientSecret
      }

      return _sendPost(this.getApiUrl('/ims/invalidate_token/v2'), undefined, postData)
    }

    // no client ID or no client Secret: assume nothing to be done and just resolve
    return Promise.resolve(true)
  }

  /**
   * Verifies a given token.
   *
   * @param {string} token the access token
   * @param {string} [clientId] the client id, optional
   * @returns {object} the server response
   */
  async validateToken (token, clientId) {
    aioLogger.debug('validateToken(%s, %s)', token, clientId)

    let tokenData
    try {
      tokenData = getTokenData(token)
    } catch (e) {
      return {
        valid: false,
        reason: 'bad payload'
      }
    }

    if (clientId === undefined) {
      clientId = tokenData.client_id
      aioLogger.debug('extracted clientId from token: %s', clientId)
    }

    const postData = {
      type: tokenData.type,
      client_id: clientId
    }

    return await _sendPost(this.getApiUrl('/ims/validate_token/v1'), token, postData)
  }

  /**
   * Gets the IMS organizations attached to the given token.
   *
   * @param {string} token the access token
   * @returns {object} the server response
   */
  async getOrganizations (token) {
    aioLogger.debug('getOrganizations(%s)', token)

    return await _sendGet(this.getApiUrl('/ims/organizations/v6'), token, {})
  }

  /**
   * Converts the access token to a token result object as follows:
   *
   * ```js
   * {
   *   access_token: {
   *     token: "eyJ4NXUiOi...6ZodTesbag",
   *     expiry: 1566242851048
   *   }
   * }
   * ```
   *
   * The `expiry` property is the expiry time of the token in milliseconds
   * since the epoch.
   *
   * @param {string} token The access token to wrap into a token result
   * @returns {Promise} a `Promise` resolving to an object as described.
   */
  async toTokenResult (token) {
    return _toTokenResult({ access_token: token })
  }
}

/**
 * Creates an instance of the `Ims` class deriving the instance's
 * environment from the `as` claim in the provided access token.
 *
 * @param {string} token The access token from which to extract the
 *      environment to setup the `Ims` instancee.
 * @returns {Promise} A `Promise` resolving to the `Ims` instance.
 */
Ims.fromToken = async token => {
  aioLogger.debug('Ims.fromToken(%s)', token)
  const as = getTokenData(token).as
  if (as) {
    const url = `https://${as}.adobelogin.com`
    for (const env in IMS_ENDPOINTS) {
      if (url === IMS_ENDPOINTS[env]) {
        aioLogger.debug('  > %s=%s', env, IMS_ENDPOINTS[env])
        return Promise.resolve({ token, ims: new Ims(env) })
      }
    }
  }
  return Promise.reject(new errors.CANNOT_RESOLVE_ENVIRONMENT())
}

module.exports = {
  getTokenData,
  Ims,
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  AUTHORIZATION_CODE,
  CLIENT_ID,
  CLIENT_SECRET,
  SCOPE
}
