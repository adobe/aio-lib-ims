export = ValidationCache;
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
/**
 * A class to cache valid or invalid results. Internally two separate cache entries are
 * maintained. Each cache entry is about 66Bytes big.
 *
 * @class ValidationCache
 */
declare class ValidationCache {
    /**
     * Creates a new LRU cache instance.
     *
     * @param {number} maxAge - The maximum age in milliseconds of cache validity.
     * @param {number} maxValidEntries - The maximum number of valid entries that can be contained in the cache.
     * @param {number} maxInvalidEntries - The maximum number of invalid entries that can be contained in the cache.
     */
    constructor(maxAge: number, maxValidEntries: number, maxInvalidEntries: number);
    /** @private */
    private validCache;
    /** @private */
    private invalidCache;
    /** @private */
    private encodingState;
    /**
     * @param {ValidationResult} res
     * @returns {string} a single char
     * @memberof ValidationCache
     * @private
     */
    private resultStr;
    /**
     * @param {ValidationResult} res
     * @returns {string} a single char
     * @memberof ValidationCache
     * @private
     */
    private encodeValidationResult;
    /**
     * @param {string} char
     * @returns {ValidationResult} a validation result entry
     * @memberof ValidationCache
     * @private
     */
    private decodeValidationResult;
    /**
     * @param {Array} params
     * @returns {string} the computed hash key
     * @memberof ValidationCache
     * @private
     */
    private computeCacheKey;
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
    validateWithCache(validationFunction: ValidationFunction, ...validationParams: string[]): Promise<object>;
}
declare namespace ValidationCache {
    export { ValidationResult, ValidationFunction };
}
type ValidationResult = {
    /**
     * validation response status code, e.g 200, 401, 403, ...
     */
    status: number;
    /**
     * validation message, e.g. reason of failed validation
     */
    message: string;
};
type ValidationFunction = Function;
