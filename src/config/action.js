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

const debug = require('debug')('@adobe/aio-lib-core-ims/config/action')
const State = require('@adobe/aio-lib-state')
const Config = require('./config')

class ActionConfig extends Config {
  constructor (configKey, options) {
    super(configKey)
    // constructor helpers
    function _checkOWEnv () {
      const requiredEnv = ['__OW_ACTION_NAME', '__OW_NAMESPACE', '__OW_API_KEY']
      const missing = []
      requiredEnv.forEach(e => {
        if (!process.env[e]) {
          missing.concat(e)
        }
      })
      if (missing.length > 0) {
        throw new Error(`missing environment variables '${missing}' to run in contextType=action, are you actually in an action's runtime?`)
      }
    }

    // start constructor
    _checkOWEnv()

    const imsConfig = options.imsConfig

    if (!imsConfig) {
      throw new Error('required options.imsConfig for contextType=action')
    }
    this._data = options.imsConfig // content inside of $ims
    this._tokensLoaded = false
    this._state = null
  }

  /**
   * @memberof ActionConfig
   * @override
   */
  async get (key) {
    debug('get(%s)', key)
    if (super._keyIsContextName(key)) {
      await this._loadTokensOnce()
    }

    return this._data[key]
  }

  /**
   * @memberof ActionConfig
   * @override
   */
  async set (key, data) {
    debug('set(%s, %o)', key, data)
    this._data[key] = data

    if (super._keyIsContextName(key)) {
      await this._setTokens(key, data)
    }
  }

  /**
   * @memberof ActionConfig
   * @override
   */
  async contexts () {
    return Object.keys(this._data).filter(this._keyIsContextName)
  }

  /* helpers */

  _getStateKey (contextName) {
    return `${this.configKey}.${process.env.__OW_ACTION_NAME.split('/').slice(0, -1).join('.')}.${contextName}`
  }

  async _initStateOnce () {
    if (!this._state) {
      // here init reads __OW_API_KEY and __OW_NAMESPACE from the action environment
      this._state = await State.init()
    }
  }

  async _loadTokensOnce () {
    if (!this._tokensLoaded) {
      await this._initStateOnce()

      const contexts = await this.contexts()

      // try to retrieve a token for each context
      const results = await Promise.all(
        contexts.map(async contextName => {
          const key = this._getStateKey(contextName)
          const stateData = await this._state.get(key)
          return { contextName, stateData }
        }))

      results.forEach(ret => {
        if (ret.stateData && ret.stateData.value) {
          if (ret.stateData.value.access_token) {
            this._data[ret.contextName].access_token = ret.stateData.value.access_token
          }
          if (ret.stateData.value.refreshToken) {
            this._data[ret.contextName].refresh_token = ret.stateData.value.refresh_token
          }
        }
      })
      this._tokensLoaded = true
    }
  }

  async _setTokens (contextName, contextData) {
    function getTTL (expiryTimes) {
      const maxExpiry = Math.max(...expiryTimes)
      return Math.floor((maxExpiry - Date.now()) / 1000)
    }

    await this._initStateOnce()

    const stateKey = this._getStateKey(contextName)

    const tokens = {}
    if (contextData.access_token) {
      tokens.access_token = contextData.access_token
    }
    if (contextData.refresh_token) {
      tokens.refresh_token = contextData.refresh_token
    }

    // set/replace tokens if any
    if (Object.keys(tokens).length > 0) {
      const ttl = getTTL(Object.values(tokens).map(t => t.expiry))
      return this._state.put(stateKey, tokens, { ttl })
    }
    // delete tokens if none
    return this._state.delete(stateKey)
  }
}

module.exports = ActionConfig
