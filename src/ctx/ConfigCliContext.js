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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-ims:ConfigCliContext', { provider: 'debug' })
const Context = require('./Context')
const { codes: errors } = require('../errors')

/**
 * The `ConfigCliContext` class stores IMS `contexts` for the Adobe I/O CLI in the local file
 * system using the Adobe I/O Core Configuration Library.
 */
class ConfigCliContext extends Context {
  constructor (keyNames) {
    super(keyNames)
    /** @private */
    this.aioConfig = require('@adobe/aio-lib-core-config')
    this.aioConfig.reload()
  }

  /**
   * Gets the cli context data
   *
   * @returns {Promise<any>} the cli context data
   */
  async getCli () {
    aioLogger.debug('get cli')
    return this.getContextValue(this.keyNames.CLI)
  }

  /**
   * Sets the cli context data
   *
   * @param {object} contextData the data to save
   * @param {boolean} [local=false] set to true to save to local config, false for global config
   * @param {boolean} [merge=true] set to true to merge existing data with the new data
   */
  async setCli (contextData, local = false, merge = true) {
    aioLogger.debug(`set cli=${JSON.stringify(contextData)} local:${!!local} merge:${!!merge}`)

    const dataIsObject = (typeof contextData === 'object' && contextData !== null)
    if (!dataIsObject) {
      throw new errors.INVALID_CONTEXT_DATA()
    }

    // make sure to not merge any global config into local and vice versa
    const getCli = source => this.getContextValueFromOptionalSource(this.keyNames.CLI, source)
    const existingData = merge ? (local ? getCli('local') : getCli('global')) : {}
    this.setContextValue(`${this.keyNames.CLI}`, { ...existingData, ...contextData }, local)
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async getContextValue (key) {
    aioLogger.debug('getContextValue(%s)', key)
    // no source option -> always get it from all sources
    return this.getContextValueFromOptionalSource(key)
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async getConfigValue (key) {
    aioLogger.debug('getConfigValue(%s)', key)
    return this.aioConfig.get(`${this.keyNames.IMS}.${this.keyNames.CONFIG}.${key}`)
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async setContextValue (key, value, isLocal) {
    aioLogger.debug('setContextValue(%s, %o, isLocal=%s)', key, value, isLocal)
    this.aioConfig.set(`${this.keyNames.IMS}.${this.keyNames.CONTEXTS}.${key}`, value, isLocal)
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async setConfigValue (key, value, isLocal) {
    aioLogger.debug('setConfigValue(%s, %o, isLocal=%s)', key, value, isLocal)
    this.aioConfig.set(`${this.keyNames.IMS}.${this.keyNames.CONFIG}.${key}`, value, isLocal)
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async contextKeys () {
    return Object.keys(this.aioConfig.get(`${this.keyNames.IMS}.${this.keyNames.CONTEXTS}`) || {})
  }

  /** @private */
  getContextValueFromOptionalSource (key, source) {
    const fullKey = `${this.keyNames.IMS}.${this.keyNames.CONTEXTS}.${key}`
    return source !== undefined ? this.aioConfig.get(fullKey, source) : this.aioConfig.get(fullKey)
  }
}

module.exports = ConfigCliContext
