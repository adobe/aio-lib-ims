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

const { Ims, ACCESS_TOKEN, REFRESH_TOKEN } = require('./ims')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-ims:token-helper', { provider: 'debug' })
const { getContext } = require('./context')
const imsJwtPlugin = '@adobe/aio-lib-ims-jwt'
const { codes: errors } = require('./errors')

/**
 * This is the default list of NPM packages used as plugins to create tokens
 * as part of the getToken(contextName) function.
 *
 * @private
 */
let DEFAULT_CREATE_TOKEN_PLUGINS = {
  jwt: imsJwtPlugin
}

/* The global var WEBPACK_ACTION_BUILD is expected to be set during build time
by aio-lib-runtime */
/* eslint no-undef: 0 */
const ACTION_BUILD = (typeof WEBPACK_ACTION_BUILD === 'undefined') ? false : WEBPACK_ACTION_BUILD
if (!ACTION_BUILD) {
  // use OAuth and CLI imports only when WEBPACK_ACTION_BUILD global is not set
  const imsCliPlugin = '@adobe/aio-lib-ims-oauth/src/ims-cli'
  const imsOAuthPlugin = '@adobe/aio-lib-ims-oauth'

  DEFAULT_CREATE_TOKEN_PLUGINS = {
    cli: imsCliPlugin,
    jwt: imsJwtPlugin,
    oauth: imsOAuthPlugin
  }
}

/**
 * Returns a consolidated list of login plugins to try for acquiring the token.
 *
 * @param {object} context The configuration context providing additional plugins
 * @returns {Promise<string[]>} The list of login plugins to try
 */
async function getMergedPlugins (context) {
  aioLogger.debug('getMergedPlugins(%o)', context)

  return context.getPlugins()
    .then((plugins) => {
      if (plugins instanceof Array && plugins.length > 0) {
        aioLogger.debug('  > adding configured plugins: %o', plugins)
        const configPluginMap = Object.fromEntries(plugins.map(element => [element, element]))
        return Object.assign(configPluginMap, DEFAULT_CREATE_TOKEN_PLUGINS)
      } else if (plugins !== undefined) {
        aioLogger.debug('Ignored configured plugins: Expected string[], got: \'%o\'', plugins)
      }

      aioLogger.debug('  > using default plugins only')
      return DEFAULT_CREATE_TOKEN_PLUGINS
    }
    )
}

/**
 * Loads the requested plugin and returns it or a dummy pluggin in case
 * of a load failure. The dummy plugin returns "false" for the supports()
 * function and will reject the canSupport() function regardless of supplied
 * parameters.
 *
 * @param {string} name The name of the plugin to try to load
 * @param {string} location The location from where to load the plugin
 * @returns {object} The loaded plugin or a dummy in case of failure to load
 */
function loadPlugin (name, location) {
  aioLogger.debug('loadPlugin(%s, %s)', name, location)

  try {
    return require(location)
  } catch (error) {
    aioLogger.debug('Ignoring plugin %s due to load failure from %s', name, location)
    aioLogger.debug('Error: %o', error)
    return {
      supports: () => false,
      canSupport: async () => Promise.reject(new Error(`Plugin not loaded: ${JSON.stringify(error)}`))
    }
  }
}

const IMS_TOKEN_MANAGER = {
  async getToken (contextName, options) {
    aioLogger.debug('getToken(%s, %o)', contextName, options)

    return this._resolveContext(contextName)
      .then(context => { return { ...context, result: this._getOrCreateToken(context.data, options) } })
      .then(result => this._persistTokens(result.name, result.data, result.result))
  },

  async invalidateToken (contextName, force) {
    aioLogger.debug('invalidateToken(%s, %s)', contextName, force)

    const tokenLabel = force ? REFRESH_TOKEN : ACCESS_TOKEN
    const { name, data } = await this._resolveContext(contextName)
    const ims = new Ims(data.env)
    return this.getTokenIfValid(data[tokenLabel])
      .catch(err => {
        if (force) {
          return this.getTokenIfValid(data[ACCESS_TOKEN])
        } else {
          return Promise.reject(err)
        }
      })
      .then(token => ims.invalidateToken(token, data.client_id, data.client_secret))
      .then(() => {
        delete data[tokenLabel]
        if (force) {
          delete data[ACCESS_TOKEN]
        }
        return this._context.set(name, data)
      })
  },

  get _context () {
    return getContext()
  },

  async _resolveContext (contextName) {
    const context = await this._context.get(contextName)
    aioLogger.debug('LoginCommand:contextData - %O', context)

    if (context.data) {
      return Promise.resolve(context)
    } else {
      return Promise.reject(new errors.CONTEXT_NOT_CONFIGURED({ messageValues: contextName }))
    }
  },

  async _getOrCreateToken (config, options) {
    aioLogger.debug('_getOrCreateToken(config=%o, options=%o)', config, options)
    const ims = new Ims(config.env)
    return this.getTokenIfValid(config.access_token)
      .catch(() => this._fromRefreshToken(ims, config.refresh_token, config))
      .catch(reason => this._generateToken(ims, config, reason, options))
  },

  async _fromRefreshToken (ims, token, config) {
    aioLogger.debug('_fromRefreshToken(token=%s, config=%o)', token, config)
    return this.getTokenIfValid(token)
      .then(refreshToken => ims.getAccessToken(refreshToken, config.client_id, config.client_secret, config.scope))
  },

  async _generateToken (ims, config, reason, options) {
    aioLogger.debug('_generateToken(reason=%s)', reason)

    const imsLoginPlugins = await getMergedPlugins(this._context)
    aioLogger.debug('  > Got imsLoginPlugins: %o', imsLoginPlugins)
    let pluginErrors = ['Cannot generate token because no plugin supports configuration:'] // eslint-disable-line prefer-const

    for (const name of Object.keys(imsLoginPlugins)) {
      aioLogger.debug('  > Trying: %s', name)
      try {
        const { canSupport, supports, imsLogin } = await loadPlugin(name, imsLoginPlugins[name])
        aioLogger.debug('  > supports(%o): %s', config, supports(config))
        if (typeof supports === 'function' && supports(config) && typeof imsLogin === 'function') {
          const loginConfig = (typeof options === 'object') ? { ...config, ...options } : config
          const result = imsLogin(ims, loginConfig)
          aioLogger.debug('  > result: %o', result)
          return result
        }

        // plugin doesn't match: we log the specific plugin errors
        if (typeof canSupport === 'function') {
          try {
            await canSupport(config)
          } catch (e) {
            pluginErrors.push(`[plugin:${name}]: ${e.message}`)
          }
        }
      } catch (e) {
        aioLogger.debug('  > Ignoring failure loading or calling plugin %s: %o', name, e)
      }
    }

    return Promise.reject(new errors.CANNOT_GENERATE_TOKEN({ messageValues: pluginErrors.join('\n') }))
  },

  /**
   * If the result is an object containing an access and refresh token,
   * the tokens are persisted back into the IMS context and the promise
   * resolves to the access token. If the result is a string, it is
   * assumed to be a valid access token to which the promise resolves.
   *
   * @param {string} context the ims context name
   * @param {object} contextData the ims context data to persist
   * @param {Promise} resultPromise the promise that contains the results (access token, or access token and refresh token)
   * @returns {Promise<string>} resolves to the access token
   */
  async _persistTokens (context, contextData, resultPromise) {
    aioLogger.debug('persistTokens(%s, %o, %o)', context, contextData, resultPromise)

    const result = await resultPromise
    if (typeof (result) === 'string') {
      return result
    }

    return this.getTokenIfValid(result.access_token)
      .then(() => { contextData.access_token = result.access_token })
      .then(() => this.getTokenIfValid(result.refresh_token))
      .then(
        () => { contextData.refresh_token = result.refresh_token },
        () => true)
      .then(() => this._context.set(context, contextData))
      .then(() => result.access_token.token)
  },

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
   * @returns {Promise<string>} the token if existing and not expired, else a rejected Promise
   */
  async getTokenIfValid (token) {
    aioLogger.debug('getTokenIfValid(token=%o)', token)
    const minExpiry = Date.now() + 10 * 60 * 1000 // 10 minutes from now
    if (token && token.expiry) {
      const tokenExpiry = Number(token.expiry)
      if (typeof (tokenExpiry) === 'number' && tokenExpiry > minExpiry && typeof (token.token) === 'string') {
        aioLogger.debug('  => %o', token.token)
        return token.token
      }
    }

    return Promise.reject(new errors.INVALID_TOKEN())
  }
}

module.exports = {
  IMS_TOKEN_MANAGER
}
