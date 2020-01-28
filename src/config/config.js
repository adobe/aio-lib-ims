function throwNotImplemented () {
  throw new Error('abstract method is not implemented')
}

class Config {
  /* Instance members to be implemented by subclasses */

  /**
   * Returns a configuration value.
   *
   * @param {string} key
   *
   * @returns {Promise<any>}
   *
   * @memberof Config
   */
  async get (key) {
    throwNotImplemented()
  }

  /**
   * Returns all context names attached with the configuration.
   *
   * @param {string} key
   * @param {any} data
   *
   * @returns {Promise<>}
   *
   * @memberof Config
   */
  async set (key, data) {
    throwNotImplemented()
  }

  /**
   * Returns all context names attached with the configuration.
   *
   * @returns {Promise<Array<String>>}
   *
   * @memberof Config
   */
  async contexts () {
    throwNotImplemented()
  }

  /* Helpers */

  async _keyIsContextName (key) {
    return !key.startsWith('$')
  }
}

module.exports = Config
