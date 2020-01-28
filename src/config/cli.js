const { contextConfig } = require('../constants')
const Config = require('./config')

class CliConfig extends Config {
  constructor (options) {
    super()

    this._cliConfig = require('@adobe/aio-lib-core-config')
    this._cliConfig.reload()
    if (options.imsConfig) {
      this._cliConfig.set(`${contextConfig.ims}`, { ...this._cliConfig.get(`${contextConfig.ims}`), ...options.imsConfig })
    }
  }

  async get (key) {
    return this._cliConfig.get(`${contextConfig.ims}.${key}`)
  }

  async set (key, data) {
    this._cliConfig.set(`${contextConfig.ims}.${key}`, data)
  }

  async contexts (key) {
    return Object.keys(this._cliConfig.get(`${contextConfig.ims}`)).filter(super._keyIsContextName)
  }
}

module.exports = CliConfig
