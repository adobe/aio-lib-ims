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

/** @private */
function throwNotImplemented () {
  throw new Error('abstract method is not implemented')
}

class Config {
  constructor (configKey) {
    this.configKey = configKey
  }

  /* Instance members to be implemented by subclasses */

  /**
   * Returns a configuration value.
   *
   * @param {string} key the config key
   *
   * @returns {Promise<any>} resolves to the config value
   *
   * @memberof Config
   */
  async get (key) {
    throwNotImplemented()
  }

  /**
   * Sets the data for a config key.
   *
   * @param {string} key the config key to write to
   * @param {any} data the data to write
   * @param {boolean} local set to true to write to the local config
   *
   * @returns {void}
   *
   * @memberof Config
   */
  async set (key, data, local = false) {
    throwNotImplemented()
  }

  /**
   * Returns all context names attached with the configuration.
   *
   * @returns {Promise<Array<string>>} resolves to all context names for the configuration
   *
   * @memberof Config
   */
  async contexts () {
    throwNotImplemented()
  }

  /* Helpers */

  _keyIsContextName (key) {
    return !key.startsWith('$')
  }
}

module.exports = Config
