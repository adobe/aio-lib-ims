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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-ims:StateActionContext', { provider: 'debug' })
const cloneDeep = require('lodash.clonedeep')
const Context = require('./Context')
const State = require('@adobe/aio-lib-state')
const { codes: errors } = require('../errors')

/**
 * The `StateActionContext` class stores IMS `contexts` for Adobe I/O Runtime Actions in the
 * cloud using the Adobe I/O State Library.
 */
class StateActionContext extends Context {
  constructor (keyNames) {
    super(keyNames)
    // constructor helpers
    /** @private */
    function checkOWEnv () {
      const requiredEnv = ['__OW_ACTION_NAME', '__OW_NAMESPACE', '__OW_API_KEY']
      const missing = []
      requiredEnv.forEach(e => {
        if (!process.env[e]) {
          missing.push(e)
        }
      })
      if (missing.length > 0) {
        throw new errors.MISSING_ENVIRONMENT_VARIABLE({ messageValues: missing.join(',') })
      }
    }

    // start constructor
    checkOWEnv()

    /** @private */
    this.data = { [keyNames.CONTEXTS]: {}, [keyNames.CONFIG]: {} } // initially empty, must be set first
    /** @private */
    this.tokensLoaded = false
    /** @private */
    this.state = null
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async getContextValue (key) {
    aioLogger.debug('getContextValue(%s)', key)
    // on first run load the tokens from the cloud State
    await this.loadTokensOnce()
    return cloneDeep(this.data[this.keyNames.CONTEXTS][key])
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async getConfigValue (key) {
    aioLogger.debug('getConfigValue(%s)', key)
    return cloneDeep(this.data[this.keyNames.CONFIG][key])
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async setContextValue (key, value, isLocal) {
    aioLogger.debug('setContextValue(%s, %o, isLocal=%s)', key, value, isLocal)

    if (!isLocal) {
      if (this.hasToken(value)) {
        await this.setTokens(key, value)
      } else if (this.hasToken(this.data[this.keyNames.CONTEXTS][key]) && !this.hasToken(value)) {
        // delete tokens only if some are cached and input data doesn't have some
        // this extra condition avoids deleting any cached token on the initial set call
        // (when setting context credentials without tokens before first get)
        // but still ensures that invalidation deletes the cached tokens
        await this.deleteTokens(key)
      }
    }

    this.data[this.keyNames.CONTEXTS][key] = cloneDeep(value)
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async setConfigValue (key, value) {
    aioLogger.debug('setConfigValue(%s, %o, isLocal=true)', key, value)
    // we only write into local memory for now (no global/cloud config)
    this.data[this.keyNames.CONFIG][key] = cloneDeep(value)
  }

  /**
   * @protected
   * @override
   * @ignore
   */
  async contextKeys () {
    return Object.keys(this.data[this.keyNames.CONTEXTS])
  }

  /* helpers */

  /** @private */
  async loadTokensOnce () {
    await this.initStateOnce()
    if (!this.tokensLoaded) {
      // contexts must be set beforehand, here we search for existing access tokens
      const contexts = await this.contextKeys()

      // try to retrieve a token for each context
      const results = await Promise.all(
        contexts.map(async contextName => {
          const key = this.getStateKey(contextName)
          const stateData = await this.state.get(key)
          return { contextName, stateData }
        }))

      results.forEach(ret => {
        if (ret.stateData && ret.stateData.value) {
          if (ret.stateData.value.access_token) {
            this.data[this.keyNames.CONTEXTS][ret.contextName].access_token = ret.stateData.value.access_token
          }
          if (ret.stateData.value.refresh_token) {
            this.data[this.keyNames.CONTEXTS][ret.contextName].refresh_token = ret.stateData.value.refresh_token
          }
        }
      })
      this.tokensLoaded = true
    }
  }

  /** @private */
  hasToken (value = {}) {
    return value.access_token || !!value.refresh_token
  }

  /** @private */
  getStateKey (contextName) {
    // token caching at action level, one state key per action
    // all contexts are stored in separate state keys
    return `${this.keyNames.IMS}.${process.env.__OW_ACTION_NAME.split('/').join('.')}.${this.keyNames.CONTEXTS}.${contextName}`
  }

  /** @private */
  async initStateOnce () {
    if (!this.state) {
      // here init reads __OW_API_KEY and __OW_NAMESPACE from the action environment
      this.state = await State.init()
    }
  }

  /** @private */
  async deleteTokens (contextName) {
    await this.initStateOnce()
    const stateKey = this.getStateKey(contextName)

    return this.state.delete(stateKey)
  }

  /** @private */
  async setTokens (contextName, contextData) {
    /**
     * @param {Array} expiryTimes array of expiry times
     * @returns {number} the time to live (TTL)
     */
    function getTTL (expiryTimes) {
      const maxExpiry = Math.max(...expiryTimes)
      return Math.floor((maxExpiry - Date.now()) / 1000)
    }

    await this.initStateOnce()
    const stateKey = this.getStateKey(contextName)

    const tokens = {
      access_token: contextData.access_token,
      refresh_token: contextData.refresh_token
    }
    // remove undefined tokens
    Object.keys(tokens).forEach(key => tokens[key] === undefined && delete tokens[key])

    const ttl = getTTL(Object.values(tokens).map(t => t.expiry))
    return this.state.put(stateKey, tokens, { ttl })
  }
}

module.exports = StateActionContext
