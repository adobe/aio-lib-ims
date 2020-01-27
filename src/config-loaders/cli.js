const { KEYS } = require('../constants')

class CliConfig {

  constructor (options) {
    this._cliConfig = require('@adobe/aio-lib-core-config')
    this._cliConfig.reload()
    if (options.inputConfig) {
      this._cliConfig.set(`${KEYS.IMS}`, { ...this._cliConfig.get(`${KEYS.IMS}`), ...options.inputConfig })
    }
  }

  async get (contextName) {
    if (!contextName) {
      return this._cliConfig.get(`${KEYS.IMS}`)
    }
    return this._cliConfig.get(`${KEYS.IMS}.${contextName}`)
  }

  async set (contextName, contextData) {
    return this._cliConfig.set(`${KEYS.IMS}.${contextName}`, contextData)
  }
}

module.exports = CliConfig
