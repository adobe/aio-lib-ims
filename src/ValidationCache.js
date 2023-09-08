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

const LRU = require('lru-cache')

/**
 * @typedef {object} ValidationResult
 * @property {number} status validation response status code, e.g 200, 401, 403, ...
 * @property {string} message validation message, e.g. reason of failed validation
 */

/**
 * @typedef {Function} ValidationFunction
 * @param {...string} params validation params used for building the cache key (at least one)
 * @returns {Promise<ValidationResult>} validation result
 */

// food for thought:
// - could we find a better data structure than 2 LRU caches (Maps) memory-wise (e.g. ageing bloom-filters - but problem is false positives)

/**
 * A class to cache valid or invalid results. Internally two separate cache entries are
 * maintained. Each cache entry is about 66Bytes big.
 *
 * @class ValidationCache
 */
class ValidationCache {
  /**
   * Creates a new LRU cache instance.
   *
   * @param {number} maxAge - The maximum age in milliseconds of cache validity.
   * @param {number} maxValidEntries - The maximum number of valid entries that can be contained in the cache.
   * @param {number} maxInvalidEntries - The maximum number of invalid entries that can be contained in the cache.
   */
  constructor (maxAge, maxValidEntries, maxInvalidEntries) {
    // we keep two separate caches, so that invalid entries can't evict valid ones
    /** @private */
    this.validCache = new LRU({ max: maxValidEntries, maxAge })
    /** @private */
    this.invalidCache = new LRU({ max: maxInvalidEntries, maxAge })
    // encode each possible response as a 2 byte char
    /** @private */
    this.encodingState = {
      charToResult: {},
      resultToChar: {},
      currentCharCode: 1 // start with 1
    }
  }

  /**
   * @param {ValidationResult} res
   * @returns {string} a single char
   * @memberof ValidationCache
   * @private
   */
  resultStr (res) {
    return `${res.status}${res.message}`
  }

  /**
   * @param {ValidationResult} res
   * @returns {string} a single char
   * @memberof ValidationCache
   * @private
   */
  encodeValidationResult (res) {
    const resultString = this.resultStr(res)
    let char = this.encodingState.resultToChar[resultString]
    if (!char) {
      // new result type
      char = String.fromCharCode(this.encodingState.currentCharCode++)
      this.encodingState.resultToChar[resultString] = char
      this.encodingState.charToResult[char] = res
    }
    return char
  }

  /**
   * @param {string} char
   * @returns {ValidationResult} a validation result entry
   * @memberof ValidationCache
   * @private
   */
  decodeValidationResult (char) {
    // should never be null as long as we always encode before decoding
    return this.encodingState.charToResult[char]
  }

  /**
   * @param {Array} params
   * @returns {string} the computed hash key
   * @memberof ValidationCache
   * @private
   */
  computeCacheKey (params) {
    // requires 32 * 2 bytes (2 for each char) in javascript
    return require('crypto').createHash('sha256').update(params.join('-')).digest().toString()
  }

  /**
   *
   * Applies a validation function and caches the result. If there is a cache entry
   * available returns the cached result without calling the validation function.
   * The cache key is computed from the validation params
   *
   * @param {ValidationFunction} validationFunction a function that returns an object of the form `{ status, message }`
   * @param {...string} validationParams  parameters for the validationFunction, must be at least one
   * @returns {Promise<object>} validation result
   * @memberof ValidationCache
   */
  async validateWithCache (validationFunction, ...validationParams) {
    const cacheKey = this.computeCacheKey(validationParams)
    const cachedCode = this.invalidCache.get(cacheKey) || this.validCache.get(cacheKey)
    if (cachedCode) {
      return this.decodeValidationResult(cachedCode)
    }
    const res = await validationFunction(...validationParams)
    const cache = res.status < 400 ? this.validCache : this.invalidCache
    cache.set(cacheKey, this.encodeValidationResult(res))
    return res
  }
}

module.exports = ValidationCache
