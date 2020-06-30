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

const debug = require('debug')('@adobe/aio-lib-ims/ctx/ConfigCliContext')
const Context = require('./Context')

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
   * @returns {object} the cli context data
   */
  async getCli () {
    debug('get cli')
    return this.getContextValue(this.keyNames.CLI)
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
    this.setContextValue(`${this.keyNames.CLI}`, { ...existingData, ...contextData }, local)
  }

  /**
   * @memberof AioConfigCliContext
   * @protected
   * @override
   */
  async getContextValue (key) {
    debug('getContextValue(%s)', key)
    return this.aioConfig.get(`${this.keyNames.IMS}.${this.keyNames.CONTEXTS}.${key}`)
  }

  /**
   * @memberof AioConfigCliContext
   * @protected
   * @override
   */
  async getConfigValue (key) {
    debug('getConfigValue(%s)', key)
    return this.aioConfig.get(`${this.keyNames.IMS}.${this.keyNames.CONFIG}.${key}`)
  }

  /**
   * @memberof AioConfigCliContext
   * @protected
   * @override
   */
  async setContextValue (key, value, isLocal) {
    debug('setContextValue(%s, %o, isLocal=%s)', key, value, isLocal)
    this.aioConfig.set(`${this.keyNames.IMS}.${this.keyNames.CONTEXTS}.${key}`, value, isLocal)
  }

  /**
   * @memberof AioConfigCliContext
   * @protected
   * @override
   */
  async setConfigValue (key, value, isLocal) {
    debug('setConfigValue(%s, %o, isLocal=%s)', key, value, isLocal)
    this.aioConfig.set(`${this.keyNames.IMS}.${this.keyNames.CONFIG}.${key}`, value, isLocal)
  }

  /**
   * @memberof AioConfigCliContext
   * @protected
   * @override
   */
  async contextKeys () {
    return Object.keys(this.aioConfig.get(`${this.keyNames.IMS}.${this.keyNames.CONTEXTS}`) || {})
  }
}

module.exports = ConfigCliContext
