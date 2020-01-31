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

const debug = require('debug')('@adobe/aio-lib-core-ims/config/cli')

const Config = require('./config')

class CliConfig extends Config {
  constructor (configKey) {
    super(configKey)

    this._cliConfig = require('@adobe/aio-lib-core-config')
    this._cliConfig.reload()
  }

  /**
   * @memberof CliConfig
   * @override
   */
  async get (key) {
    debug('set(%s)', key)
    return this._cliConfig.get(`${this.configKey}.${key}`)
  }

  /**
   * @memberof CliConfig
   * @override
   */
  async set (key, data) {
    debug('set(%s, %o)', key, data)
    this._cliConfig.set(`${this.configKey}.${key}`, data)
  }

  /**
   * @memberof CliConfig
   * @override
   */
  async contexts () {
    return Object.keys(this._cliConfig.get(`${this.configKey}`)).filter(this._keyIsContextName)
  }
}

module.exports = CliConfig
