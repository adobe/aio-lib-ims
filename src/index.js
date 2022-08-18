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

const { getContext } = require('./context')

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
 * The `@adobe/aio-lib-ims` module offers three kinds of elements:
 *
 * 1. Managing configuration contexts for token creation and use
 * 2. Creating and invalidating tokens
 * 3. Providing low level access to IMS API
 *
 * @exports aio-lib-ims
 */
module.exports = {
  /** @see [`getTokenData`](#gettokendata) */
  getTokenData,

  /** @see [`Ims`](#ims) */
  Ims,

  /** @see [`ACCESS_TOKEN`](#access_token) */
  ACCESS_TOKEN,

  /** @see [`REFRESH_TOKEN`](#refresh_token) */
  REFRESH_TOKEN,

  /** @see [`AUTHORIZATION_CODE`](#authorization_code) */
  AUTHORIZATION_CODE,

  /** @see [`CLIENT_ID`](#client_id) */
  CLIENT_ID,

  /** @see [`CLIENT_SECRET`](#client_secret) */
  CLIENT_SECRET,

  /** @see [`SCOPE`](#scope) */
  SCOPE,

  /**
   * @see [`Context`](#context)
   */
  context: getContext(),

  /**
   * Returns an access token for the given context name. When running in Adobe I/O Runtime
   * tokens will be persisted in the [`State SDK`](https://github.com/adobe/aio-lib-state).
   *
   * @param {string} contextName The name of the IMS context for which to return the
   *              access token. If this is empty, the token(s) of the current IMS context
   *              are invalidated.
   * @param {object} options A set of arbitrary options which will be passed to the underlying login plugin.
   * @returns {Promise} Resolving to an access token (string)
   */
  getToken: async (contextName, options) => IMS_TOKEN_MANAGER.getToken(contextName, options),

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
   * @param {boolean} [force] Whether to invalidate just the access token or
   *              to also invalidate the refresh token. Defaults to `false`.
   * @returns {Promise} Promise that resolves with the request data
   */
  invalidateToken: async (contextName, force) => IMS_TOKEN_MANAGER.invalidateToken(contextName, !!force)
}
