/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const debug = require('debug')('@adobe/aio-lib-ims/ctx/Context')

/**
 * The `Context` abstract class provides an interface to manage the IMS configuration contexts on behalf of
 * the Adobe I/O Lib IMS Library.
 */
class Context {
  constructor (keyNames) {
    this.keyNames = keyNames
  }

  /**
   * Gets the current context name.
   *
   * @returns {Promise<string>} the current context name
   */
  async getCurrent () {
    debug('get current')
    return this.getConfigValue(this.keyNames.CURRENT)
  }

  /**
   * Sets the current context name
   *
   * @param {string} contextName The name of the context to use as the current context
   * @param {boolean} [local=true] Persist the current name in local or global configuration, this is not relevant when running in Adobe I/O Runtime.
   * @returns {Promise<any>} returns an instance of the Config object
   */
  async setCurrent (contextName, local = true) {
    debug('set current=%s', contextName)
    await this.setConfigValue(this.keyNames.CURRENT, contextName, local)
  }

  /**
   * Gets the list of additional IMS login plugins to consider. The JWT and OAuth2 plugins
   * are required by the AIO Lib IMS library and are always installed and used.
   *
   * Unless running in Adobe I/O Runtime, the list of plugins is always stored in the
   * global configuration.
   *
   * @returns {Promise<Array<string>>} array of plugins
   */
  async getPlugins () {
    debug('get plugins')
    return this.getConfigValue(this.keyNames.PLUGINS)
  }

  /**
   * Sets the list of additional IMS login plugins to consider.
   * The JWT and OAuth2 plugins are required by the AIO Lib IMS
   * library and are always installed and used.
   *
   * Unless running in Adobe I/O Runtime, the list of plugins is always stored in the
   * global configuration.
   *
   * @param {Promise<Array<string>>} plugins array of plugins
   */
  async setPlugins (plugins) {
    debug('set plugins=%o', plugins)
    await this.setConfigValue(this.keyNames.PLUGINS, plugins, false)
  }

  /**
   * Returns an object representing the named context.
   * If the contextName parameter is empty or missing, it defaults to the
   * current context name. The result is an object with two properties:
   *
   *   - `name`: The actual context name used
   *   - `data`: The IMS context data
   *
   * @param {string} contextName Name of the context information to return.
   * @returns {Promise<object>} The configuration object
   */
  async get (contextName) {
    debug('get(%s)', contextName)

    if (!contextName) {
      contextName = await this.getCurrent()
    }

    if (contextName) {
      return {
        name: contextName,
        data: await this.getContextValue(contextName)
      }
    }

    // missing context and no current context
    return { name: contextName, data: undefined }
  }

  /**
   * Updates the named configuration with new configuration data. If a configuration
   * object for the named context already exists it is completely replaced with this new
   * configuration. If no current contexts are set, then contextName will be set as
   * current context.
   *
   * @param {string} contextName Name of the context to update
   * @param {object} contextData The configuration data to store for the context
   * @param {boolean} local Persist in local or global configuration. When running in
   * Adobe I/O Runtime, setting `local = true` disables persistence of generated tokens.
   *
   */
  async set (contextName, contextData, local = false) {
    debug('set(%s, %o)', contextName, contextData, !!local)

    let current
    if (!contextName) {
      current = await this.getCurrent()
      contextName = current
    }
    if (!contextName) {
      throw new Error('Missing IMS context label to set context data for')
    }

    await this.setContextValue(contextName, contextData, !!local)

    // if there is no current context set, set this one
    if (!current && !await this.getCurrent()) {
      debug(`current is not set, setting current to '${contextName}'`, contextName)
      await this.setCurrent(contextName)
    }
  }

  /**
   * Returns the names of the configured contexts as an array of strings.
   *
   * @returns {Promise<string[]>} The names of the currently known configurations.
   */
  async keys () {
    debug('keys()')
    return this.contextKeys()
  }

  /* To be implemented */

  /**
   *
   * @param {string} configName config name
   * @returns {Promise<any>} config value
   * @protected
   * @ignore
   */
  async getConfigValue (configName) {
    throwNotImplemented()
  }

  /**
   * @param {string} configName config name
   * @param {any} configValue config value
   * @param {boolean} isLocal write local or not
   * @protected
   * @ignore
   */
  async setConfigValue (configName, configValue, isLocal) {
    throwNotImplemented()
  }

  /**
   * @param {string} contextName context name
   * @returns {Promise<any>} context value
   * @protected
   * @ignore
   */
  async getContextValue (contextName) {
    throwNotImplemented()
  }

  /**
   * @param {string} contextName config name
   * @param {any} ctxValue config value
   * @param {boolean} isLocal write local or not
   * @protected
   * @ignore
   */
  async setContextValue (contextName, ctxValue, isLocal) {
    throwNotImplemented()
  }

  /**
   * @ignore
   * @protected
   * @returns {Promise<string[]>} return defined contexts
   */
  async contextKeys () {
    throwNotImplemented()
  }
}

/** @private */
function throwNotImplemented () {
  throw new Error('abstract method is not implemented')
}

module.exports = Context
