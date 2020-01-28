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

const { IMS_TOKEN_MANAGER } = require('./token-helper')
const { context } = require('./context')
const {
  getTokenData,
  Ims,
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  AUTHORIZATION_CODE,
  CLIENT_ID,
  CLIENT_SECRET,
  SCOPE
} = require('./ims')

/**
 * The `@adobe/aio-lib-core-ims` module offers three kinds of elements:
 *
 * 1. Managing configuration contexts for token creation and use
 * 2. Creating and invalidating tokens
 * 3. Providing low level access to IMS API
 *
 * @exports @adobe/aio-lib-core-ims
 */
module.exports = {
  /** @see (#getTokenData) */
  getTokenData,

  /** @see (#Ims) */
  Ims,

  /** @see (#ACCESS_TOKEN) */
  ACCESS_TOKEN,

  /** @see (#REFRESH_TOKEN) */
  REFRESH_TOKEN,

  /** @see (#AUTHORIZATION_CODE) */
  AUTHORIZATION_CODE,

  /** @see (#CLIENT_ID) */
  CLIENT_ID,

  /** @see (#CLIENT_SECRET) */
  CLIENT_SECRET,

  /** @see (#SCOPE) */
  SCOPE,

  /**
     * The `context` object manages the IMS configuration contexts on behalf of
     * the Adobe I/O Lib Core IMS Library.
     *
     * @see The [`context`](#context) object
     */
  context,

  /**
     * Returns an access token for the given context name.
     *
     * @param {string} contextName The name of the IMS context for which to return the
     *              access token. If this is empty, the token(s) of the current IMS
     *              context are invalidated.
     * @param {Object} [options]
     * @param {boolean} [options.force] Forces a login in the selected plugin's `imslogin`
     *              function. See [Forced `imsLogin`](README.md#forced-imslogin) for more
     *              information on this flag. The default value is `false`.
     * @param {string} [options.contextType] The type of context to use for loading the
     *              auth configuration, possible values are **'cli' or 'action'**. If left
     *              empty, this module will attempt to auto detect the current context
     *              type from the runtime environment. When 'cli' is used, the ims
     *              configuration is read from and written to local disk using
     *              `@adobe/aio-lib-core-config`. Alternatively, the context type 'action'
     *              should be used when running the module in an Adobe I/O Runtime
     *              function (OpenWhisk action), in that case the ims configuration should
     *              be passed to `options.imsConfig` and tokens will be persisted using
     *              `@adobe/aio-lib-state`.
     * @param {object} [options.imsConfig] An ims configuration object. This is required
     *              if `contextType==='action'. When `contextType==='cli'` the input
     *              imsConfig is merged with the loaded config.
     *
     * @returns {Promise} Resolving to an access token (string)
     */
  getToken: async (contextName, options = {}) => IMS_TOKEN_MANAGER.getToken(contextName, options),

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
  invalidateToken: async (contextName, force) => IMS_TOKEN_MANAGER.invalidateToken(contextName, !!force)
}
