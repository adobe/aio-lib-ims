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

const debug = require('debug')('@adobe/aio-lib-ims/context')

const ActionConfig = require('./config/action')
const CliConfig = require('./config/cli')

/** Name of context type action */
const TYPE_ACTION = 'action'

/** Name of context type cli */
const TYPE_CLI = 'cli'

/** Name of the IMS configuration context data structure */
const IMS = '$ims'

/** Property holding the cli context name */
const CLI = '$cli'

/** Property holding the current context name */
const CURRENT = '$current'

/** Property holding the list of additional login plugins */
const PLUGINS = '$plugins'

/**
 * The `context` object manages the IMS configuration contexts on behalf of
 * the Adobe I/O Lib Core IMS Library.
 */
class Context {
  constructor (contextType) {
    switch (contextType) {
      case TYPE_ACTION:
        this._config = new ActionConfig(IMS)
        break
      case TYPE_CLI:
      case undefined: // default
        this._config = new CliConfig(IMS)
        break
      /* istanbul ignore next */
      default:
        throw new Error(`contextType '${contextType}' is not supported`)
    }
  }

  /**
   * Gets the cli context data
   *
   * @returns {object} the cli context data
   */
  async getCli () {
    debug('get cli')
    return this._config.get(CLI)
  }

  /**
   * Sets the cli context data
   *
   * @param {object} contextData the data to save
   * @param {boolean} [local=true] set to true to save to local config, false for global config
   * @param {boolean} [merge=true] set to true to merge existing data with the new data
   */
  async setCli (contextData, local = true, merge = true) {
    debug(`set cli=${JSON.stringify(contextData)} local:${!!local} merge:${!!merge}`)

    const dataIsObject = (typeof contextData === 'object' && contextData !== null)
    if (!dataIsObject) {
      throw new Error('contextData must be an object')
    }

    const existingData = await this.getCli()
    this._config.set(CLI, { ...existingData, ...contextData }, local)
  }

  /**
   * Gets the current context name.
   *
   * @returns {Promise<string>} the current context name
   */
  async getCurrent () {
    debug('get current')
    return this._config.get(CURRENT)
  }

  /**
   * Sets the current context name
   *
   * @param {string} contextName The name of the context to use as the current context
   * @param {boolean} [local=true] Persist the current name in local or global configuration, this is not relevant when running in Adobe I/O Runtime.
   */
  async setCurrent (contextName, local = true) {
    debug('set current=%s', contextName)
    return this._config.set(CURRENT, contextName, local)
  }

  /**
   * Gets the list of additional IMS login plugins to consider. The JWT and OAuth2 plugins
   * are required by the AIO Lib Core IMS library and are always installed and used.
   *
   * Unless running in Adobe I/O Runtime, the list of plugins is always stored in the
   * global configuration.
   *
   * @returns {Promise<Array<string>>} array of plugins
   */
  async getPlugins () {
    debug('get plugins')
    return this._config.get(PLUGINS)
  }

  /**
   * Sets the list of additional IMS login plugins to consider.
   * The JWT and OAuth2 plugins are required by the AIO Lib Core IMS
   * library and are always installed and used.
   *
   * Unless running in Adobe I/O Runtime, the list of plugins is always stored in the
   * global configuration.
   *
   * @param {Promise<Array<string>>} plugins array of plugins
   */
  async setPlugins (plugins) {
    debug('set plugins=%o', plugins)
    this._config.set(PLUGINS, plugins, false)
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
        data: await this._config.get(contextName)
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

    await this._config.set(contextName, contextData, !!local)

    // if there are no current context set, set this one
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
    return this._config.contexts()
  }
}

/** @private */
function _guessContextType () {
  if (process.env.__OW_ACTION_NAME) {
    return 'action'
  }
  return 'cli'
}

Context.context = null
/** @private */
function getContext () {
  if (!Context.context) {
    Context.context = new Context(_guessContextType())
  }
  return Context.context
}

/** @private */
function resetContext () {
  Context.context = null
}

module.exports = {
  resetContext,
  getContext,
  TYPE_ACTION,
  TYPE_CLI,
  IMS,
  CURRENT,
  CLI,
  PLUGINS
}
