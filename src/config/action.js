const State = require('@adobe/aio-lib-state')
const Config = require('./config')
const { contextConfig } = require('../constants')

class ActionConfig extends Config {
  constructor (options) {
    super()
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
    if (super._keyIsContextName(key)) {
      await this._loadTokensOnce()
    }

    return this._data[key]
  }

  /**
   * @memberof ActionConfig
   * @override
   */
  async set (key, contextData) {
    this._data[key] = contextData

    if (super._keyIsContextName(key)) {
      await this._persistTokensIfAny(key, contextData)
    }
  }

  /**
   * @memberof ActionConfig
   * @override
   */
  async contexts () {
    return Object.keys(this._data).filter(super._keyIsContextName)
  }

  /* helpers */

  static _getStateKey (contextName) {
    return `${contextConfig.ims}.${process.env.__OW_ACTION_NAME.split('/').slice(0, -1).join('.')}.${contextName}`
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

      const contexts = Object.keys(this._data).filter(k => !Object.values(contextConfig).includes(k))

      // try to retrieve a token for each context
      const results = await Promise.all(
        contexts.map(async contextName => {
          const key = ActionConfig._getStateKey(contextName)
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

  async _persistTokensIfAny (contextName, contextData) {
    function getNewTTL (currTTL, token) {
      const expirySeconds = Math.floor((token.expiry - Date.now()) / 1000)
      return expirySeconds > currTTL ? expirySeconds : currTTL
    }

    await this._initStateOnce()

    // persist tokens if any
    const tokens = {}
    let ttl = 0 // default
    if (contextData.access_token) {
      tokens.access_token = contextData.access_token
      ttl = getNewTTL(ttl, tokens.access_token)
    }
    if (contextData.refresh_token) {
      tokens.refresh_token = contextData.refresh_token
      ttl = getNewTTL(ttl, tokens.refresh_token)
    }
    if (Object.keys(tokens).length > 0) {
      const stateKey = ActionConfig._getStateKey(contextName)
      return this._state.put(stateKey, tokens, { ttl })
    }
  }
}

module.exports = ActionConfig
