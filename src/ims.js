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

const rp = require('request-promise-native')
const debug = require('debug')('@adobe/aio-cli-ims/ims');

const IMS_ENDPOINTS = {
    stage: "https://ims-na1-stg1.adobelogin.com",
    prod: "https://ims-na1.adobelogin.com"
}

const ACCESS_TOKEN = "access_token";
const REFRESH_TOKEN = "refresh_token";
const AUTHORIZATION_CODE = "authorization_code";
const CLIENT_ID = "client_id";
const CLIENT_SECRET = "client_secret";
const SCOPE = "scope";

async function sendRequest(method, url, token, data) {

    const options = {
        uri: url,
        method: method,
        headers: {
            'User-Agent': 'aio-cli-ims'
        },
        json: true
    }

    if (data) {
        if (method === 'GET') {
            options.qs = data;
        } else {
            options.form = data;
        }
    }

    if (token) {
        options.auth = { bearer: token };
    }

    return rp(options);
}
async function sendGet(getUrl, token, getData) {
    return sendRequest('GET', getUrl, token, getData);
}

async function sendPost(postUrl, token, postData) {
    return sendRequest('POST', postUrl, token, postData);
}

function _getTokenPayloadJson(token) {
    const [header, payload, sig] = token.split(".", 3);
    return JSON.parse(Buffer.from(payload, 'base64'));
}

function calculateExpiry(token) {
    // Note: could use jwt library, but this is simpler and slicker
    const data = _getTokenPayloadJson(token);
    return parseInt(data.created_at) + parseInt(data.expires_in);
}

function getTokenType(token) {
    return _getTokenPayloadJson(token).type;
}

/**
 * ```json
 * {
 *  "access_token": {
 *    "token": <access_token>,
 *    "expiry": <expiry-time-in-ms-since-epoch>
 *  },
 *  "refresh_token": {
 *    "token": >refresh_token>,
 *    "expiry": <expiry-time-in-ms-since-epoch>
 *  },
 *  "payload": {
 *   <full-response>
 *  }
 * }
 * ```
 */
async function toTokenResult(apiResponse) {
    debug("toTokenResult(%o)", apiResponse);
    const result = {
        payload: apiResponse
    }

    for (const label of [ ACCESS_TOKEN, REFRESH_TOKEN ]) {
        debug(" > %s", label);
        const token = apiResponse[label];
        debug(" > %o", token);
        if (token) {
            result[label] = {
                token: token,
                expiry: calculateExpiry(token)
            }
            debug(" > %o", result[label]);
        }
    }

    debug("<< %o", result);
    return result;
}

/**
 * Returns the decoded token value as JavaScript object.
 *
 * @param {string} token The token to decode and extract the token value from
 *
 * @returns {object} The decoded token payload data without header and signature
 */
function getTokenData(token) {
    const [header, payload, sig] = token.split(".", 3);
    return JSON.parse(Buffer.from(payload, 'base64'));
}

class Ims {

    /**
     * Creats a new IMS connector instance for the stage or prod environment
     * @param {string} env
     */
    constructor(env) {
        if (!env || !IMS_ENDPOINTS[env]) {
            env = "stage";
        }

        this.endpoint = IMS_ENDPOINTS[env];
    }

    getApiUrl(api) {
        return this.endpoint + api;
    }

    getSusiUrl(clientId, scopes, callbackUrl, state) {
        debug("getSusiUrl(%s, %s, %s, %s)", clientId, scopes, callbackUrl, state);

        const app = new URL(this.getApiUrl("/ims/authorize/v1"));
        app.searchParams.set("response_type", "code");
        app.searchParams.set(CLIENT_ID, clientId);
        app.searchParams.set(SCOPE, scopes);
        app.searchParams.set("redirect_uri", callbackUrl);
        app.searchParams.set("state", state);
        return app.toString();
    }

    /**
     *
     * @param {string} api The IMS API to GET, e.g. /ims/profile/v1
     * @param {string} token The IMS access token to call the API
     * @param {Map} parameters A map of request parameters
     *
     * @returns a promise resolving to the result of the request
     */
    async get(api, token, parameters) {
        debug("get(%s, %s, %o)", api, token, parameters);

        return sendGet(this.getApiUrl(api), token, parameters);
    }

    /**
     *
     * @param {string} api The IMS API to GET, e.g. /ims/profile/v1
     * @param {string} token The IMS access token to call the API
     * @param {Map} parameters A map of request parameters
     *
     * @returns a promise resolving to the result of the request
     */
    async post(api, token, parameters) {
        debug("post(%s, %s, %o)", api, token, parameters);

        return sendPost(this.getApiUrl(api), token, parameters);
    }

    /**
     *
     * @param {string} authCode
     * @param {string} clientId
     * @param {string} clientSecret
     * @param {string} scopes
     *
     * @returns a promise resolving to a tokens object as described in the {@link toTokenResult} or rejects to an error message.
     */
    async getAccessToken(authCode, clientId, clientSecret, scopes) {
        debug("getAccessToken(%s, %s, %s, %o)", authCode, clientId, clientSecret, scopes);

        // prepare the data with common data
        const postData = {
            client_id: clientId,
            client_secret: clientSecret,
            scope: scopes
        }

        // complete data with authCode specific grant type and property
        const tokenType = getTokenType(authCode);
        if (tokenType == AUTHORIZATION_CODE) {
            // for service tokens this is the static authCode
            // for OAuth Tokerns this is the code received from the redirect
            postData.grant_type = AUTHORIZATION_CODE;
            postData.code = authCode;
        } else if (tokenType == REFRESH_TOKEN) {
            // for refresh tokens
            postData.grant_type = REFRESH_TOKEN;
            postData.refresh_token = authCode;
        } else {
            Promise.reject(`Unknown type of authCode: ${tokenType}`);
        }

        return sendPost(this.getApiUrl("/ims/token/v1"), undefined, postData)
            .then(response => toTokenResult(response));
    }

    /**
     * Asks for the signed JWT token to be exchanged for a valid access
     * token as well as a refresh token.
     *
     * @param {string} clientId The client ID of the owning application
     * @param {string} clientSecret The client's secret
     * @param {string} signedJwtToken The properly signed JWT token for the JWT token exchange
     */
    async exchangeJwtToken(clientId, clientSecret, signedJwtToken) {
        debug("exchangeJwtToken(%s, %s, %s)", clientId, clientSecret, signedJwtToken);

        const postData = {
            client_id: clientId,
            client_secret: clientSecret,
            jwt_token: signedJwtToken
        }

        return sendPost(this.getApiUrl("/ims/exchange/jwt"), undefined, postData)
            .then(response => toTokenResult(response));
    }

    /**
     * Invalidates the given token. If the token is a refresh token, all the
     * access tokens created with that refresh token will also be invalidated
     * at the same time.
     *
     * @param {string} token
     * @param {string} clientId
     * @param {string} clientSecret
     */
    async invalidateToken(token, clientId, clientSecret) {
        debug("invalidateToken(%s, %s, %s)", token, clientId, clientSecret);

        const postData = {
            token_type: getTokenType(token),
            token,
            cascading: "all",
            client_id: clientId,
            client_secret: clientSecret
        };

        return sendPost(this.getApiUrl("/ims/invalidate_token/v2"), undefined, postData);
    }
}

Ims.fromToken = async token => {
    debug("Ims.fromToken(%s)", token);
    const as = _getTokenPayloadJson(token).as;
    if (as) {
        const url = `https://${as}.adobelogin.com`;
        for (const env in IMS_ENDPOINTS) {
            if (url === IMS_ENDPOINTS[env]) {
                debug("  > %s=%s", env, IMS_ENDPOINTS[env]);
                return Promise.resolve({ token, ims: new Ims(env) });
            }
        }
    }
    return Promise.reject(new Error("Cannot resolve to IMS environment from token"));
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
};
