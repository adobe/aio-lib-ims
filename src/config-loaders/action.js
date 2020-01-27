const State = require('@adobe/aio-lib-state')
const { contextConfig } = require('../constants')

class ActionConfig {
  constructor (options) {
    // todo error if not in ow runtime
    if (!options.inputConfig) {
      throw new Error('required options.inputConfig for contextType=action')
    }
    this._data = options.inputConfig // content inside of $ims
    this._tokenLoaded = false
    this._state = null
  }

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
    if (!this._tokenLoaded) {
      await this._initStateOnce()

      const contexts = Object.keys(this._data).filter(k => !Object.keys(contextConfig).includes(k))

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
    }
  }

  async get (contextName) {
    await this._loadTokensOnce()
    if (!contextName) {
      return this._data
    }
    return this._data[contextName]
  }

  async set (contextName, contextData) {
    function getNewTTL (currTTL, token) {
      const expirySeconds = Math.floor(token.expiry / 1000)
      return expirySeconds > currTTL ? expirySeconds : currTTL
    }

    await this._initStateOnce()

    this._data[contextName] = contextData

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
