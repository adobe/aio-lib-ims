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

const ActionConfig = require('./config-loaders/action')
const CliConfig = require('./config-loaders/cli')

const { contextConfig } = require('./constants')

/**
 * The `context` object manages the KEYS.IMS configuration contexts on behalf of
 * the Adobe I/O Lib Core KEYS.IMS Library.
 */
class Context {
  constructor (contextType, options) {
    switch (contextType) {
      case 'action':
        this._config = new ActionConfig(options)
        break
      case 'cli':
      case undefined: // default
        this._config = new CliConfig(options)
        break
      default:
        throw new Error(`contextType '${contextType}' is not supported`)
    }
  }

  async getCurrent () {
    debug('get current')
    return this._config.get(contextConfig.current)
  }

  async setCurrent (contextName) {
    debug('set current=%s', contextName)
    return this._config.set(contextConfig.current, contextName)
  }

  async getPlugins () {
    debug('get plugins')
    return this._config.get(contextConfig.plugins)
  }

  async setPlugins (plugins) {
    debug('set plugins=%o', plugins)
    this._config.set(contextConfig.plugins, plugins)
  }

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

  async set (contextName, contextData) {
    debug('set(%s, %o)', contextName, contextData)

    if (!contextName) {
      contextName = await this.getCurrent()
    }
    if (contextName) {
      return this._config.set(contextName, contextData)
    }

    throw new Error('Missing context label to set context data for')
  }

  /**
   * Returns the names of the configured contexts as an array of strings.
   *
   * @returns {string[]} The names of the currently known configurations.
   */
  keys () {
    debug('keys()')
    return Object.keys(this._config.get()).filter(k => !Object.keys(contextConfig).includes(k))
  }
}

Context.context = null
Context.init = function (contextType, options) {
  if (!Context.context) {
    Context.context = new Context(contextType, options)
  }
  return Context.context
}

module.exports = {
  context: Context.context,
  init: Context.init
}
