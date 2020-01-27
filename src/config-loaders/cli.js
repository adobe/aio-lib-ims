const { contextConfig } = require('../constants')

class CliConfig {
  constructor (options) {
    this._cliConfig = require('@adobe/aio-lib-core-config')
    this._cliConfig.reload()
    if (options.inputConfig) {
      this._cliConfig.set(`${contextConfig.ims}`, { ...this._cliConfig.get(`${contextConfig.ims}`), ...options.inputConfig })
    }
  }

  async get (contextName) {
    if (!contextName) {
      return this._cliConfig.get(`${contextConfig.ims}`)
    }
    return this._cliConfig.get(`${contextConfig.ims}.${contextName}`)
  }

  async set (contextName, contextData) {
    return this._cliConfig.set(`${contextConfig.ims}.${contextName}`, contextData)
  }
}

module.exports = CliConfig
