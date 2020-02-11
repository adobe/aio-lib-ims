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

const debug = require('debug')('@adobe/aio-lib-core-ims/context')

const ActionConfig = require('./config/action')
const CliConfig = require('./config/cli')

/** Name of context type action */
const TYPE_ACTION = 'action'

/** Name of context type cli */
const TYPE_CLI = 'cli'

/** Name of the IMS configuration context data structure */
const IMS = '$ims'

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
   */
  async setCurrent (contextName) {
    debug('set current=%s', contextName)
    return this._config.set(CURRENT, contextName)
  }

  /**
   * Gets the list of additional IMS login plugins to consider.
   * The JWT and OAuth2 plugins are required by the AIO Lib Core IMS
   * library and are always installed and used.
   *
   * @returns {Promise<Array>} array of plugins
   */
  async getPlugins () {
    debug('get plugins')
    return this._config.get(PLUGINS)
  }

  async setPlugins (plugins) {
    debug('set plugins=%o', plugins)
    this._config.set(PLUGINS, plugins)
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
   */
  async set (contextName, contextData) {
    debug('set(%s, %o)', contextName, contextData)
    let current
    if (!contextName) {
      current = await this.getCurrent()
      contextName = current
    }
    if (!contextName) {
      throw new Error('Missing IMS context label to set context data for')
    }

    await this._config.set(contextName, contextData)

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

function _guessContextType () {
  if (process.env.__OW_ACTION_NAME) {
    return 'action'
  }
  return 'cli'
}

Context.context = null
function getContext () {
  if (!Context.context) {
    Context.context = new Context(_guessContextType())
  }
  return Context.context
}

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
  PLUGINS
}
