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

const { Ims, ACCESS_TOKEN, REFRESH_TOKEN } = require('./ims');
const debug = require('debug')('@adobe/aio-cna-core-ims/token-helper');

/**
 * This is the default list of NPM packages used as plugins to create tokens
 * as part of the getToken(contextName) function.
 * @private
 */
const DEFAULT_CREATE_TOKEN_PLUGINS = ['@adobe/aio-cna-core-ims-jwt', '@adobe/aio-cna-core-ims-oauth'];

class ImsTokenManager {

    async getToken(contextName) {
        debug("getToken(%s)", contextName);

        return this._resolveContext(contextName)
            .then(context => { return { ...context, result: this._getOrCreateToken(context.data) } })
            .then(result => this._persistTokens(result.name, result.data, result.result));
    }

    async invalidateToken(contextName, force) {
        debug("invalidateToken(%s, %s)", contextName, force);

        const tokenLabel = force ? REFRESH_TOKEN : ACCESS_TOKEN;
        const { name, data } = await this._resolveContext(contextName)
        const ims = new Ims(data.env);
        return this.getTokenIfValid(data[tokenLabel])
            .catch(err => {
                if (force) {
                    return this.getTokenIfValid(data[ACCESS_TOKEN]);
                } else {
                    return Promise.reject(err);
                }
            })
            .then(token => ims.invalidateToken(token, data.client_id, data.client_secret))
            .then(() => {
                delete data[tokenLabel];
                if (force) {
                    delete data[ACCESS_TOKEN];
                }
                this._context.set(name, data);
            });
    }

    get _context() {
        if (!this.__context) {
            this.__context = require('./context').context;
        }
        return this.__context;
    }

    async _resolveContext(contextName) {
        const context = this._context.get(contextName);
        debug("LoginCommand:contextData - %O", context);

        if (context.data) {
            return Promise.resolve(context);
        } else {
            return Promise.reject(new Error(`IMS context '${context.name}' is not configured`));
        }
    }

    async _getOrCreateToken(config) {
        const ims = new Ims(config.env);
        return this.getTokenIfValid(config.access_token)
            .catch(() => this._fromRefreshToken(ims, config.refresh_token, config))
            .catch(reason => this._generateToken(ims, config, reason));
    }

    async _fromRefreshToken(ims, token, config) {
        return this.getTokenIfValid(token)
            .then(refreshToken => ims.getAccessToken(refreshToken, config.client_id, config.client_secret, config.scope));
    }

    async _generateToken(ims, config, reason) {
        debug("generateToken(reason=%s)", reason);

        const imsLoginPlugins =  DEFAULT_CREATE_TOKEN_PLUGINS.concat(this._context.plugins);
        if (imsLoginPlugins) {
            for (const imsLoginPlugin of imsLoginPlugins) {
                debug("  > Trying: %s", imsLoginPlugin);
                try {
                    const { supports, imsLogin } = require(imsLoginPlugin);
                    if (typeof supports === 'function' && supports(config) && typeof imsLogin === 'function' ) {
                        const result = imsLogin(ims, config);
                        debug("  > result: %o", result);
                        return result;
                    }
                } catch (e) {
                    debug("  > Ignoring failure loading or calling plugin %s: %o", imsLoginPlugin, e);
                }
            }
        }

        return Promise.reject(new Error("Cannot generate token because no plugin supports configuration"));
    }

    /**
     * If the result is an object containing an access and refresh token,
     * the tokens are persisted back into the IMS context and the promise
     * resolves to the access token. If the result is a string, it is
     * assumed to be a valid access token to which the promise resolves.
     *
     * @param {string | any} result
     */
    async _persistTokens(context, contextData, resultPromise) {
        debug("persistTokens(%s, %o, %o)", context, contextData, resultPromise);

        const result = await resultPromise;
        if (typeof (result) === 'string') {
            return result;
        }

        return this.getTokenIfValid(result.access_token)
            .then(() => contextData.access_token = result.access_token)
            .then(() => this.getTokenIfValid(result.refresh_token))
            .then(
                () => contextData.refresh_token = result.refresh_token,
                () => true)
            .then(() => this._context.set(context, contextData))
            .then(() => result.access_token.token)
    }

    /**
     * Validates the token is not expired yet and returns it if so.
     * Otherwise a rejected Promise is returned indicating that fact.
     * The token parameter is expected to be an object with two
     * properties: "token" with the actual token value which is
     * returned. The "expiry" property must be a number indicating
     * the expiry time of the token in ms since the Epoch. This time
     * must be at least 10 minutes in the future for the token to be
     * returned.
     *
     * @param {*} token The token hash
     *
     * @returns the token if existing and not expired, else a rejected Promise
     */
    async getTokenIfValid(token) {
        debug("getTokenIfValid(%o)", token);
        const minExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
        if (token && typeof (token.expiry) === 'number' && token.expiry > minExpiry && typeof (token.token) === 'string') {
            debug("  => %o", token.token);
            return token.token;
        }

        return Promise.reject("Token missing or expired");
    }
}

module.exports = {
    getToken: (contextName) => new ImsTokenManager().getToken(contextName),

    /**
     * Invalidates the access and optionally refresh of an IMS context.
     * The name of the IMS context is given as its first parameter and defaults
     * to the current context if missing or empty. The force parameter indicates
     * whether only the access token is invalidated (force=false) or the refresh
     * token (if existing) is also invalidated (force=true). If the refresh token
     * exists and is validated, all access tokens which have been created with
     * this refresh token will automatically become invalid as well.
     *
     * @param {string} contextName The name of the IMS context for which to
     *              invalidate the token(s). If this is empty, the token(s) of
     *              the current IMS context are invalidated.
     * @param {boolean} force Whether to invalidate just the access token or
     *              to also invalidate the refresh token.
     */
    invalidateToken: (contextName, force) => new ImsTokenManager().invalidateToken(contextName, !!force)
}
