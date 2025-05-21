export namespace IMS_TOKEN_MANAGER {
    function getToken(contextName: any, options: any): Promise<string>;
    function invalidateToken(contextName: any, force: any): Promise<any>;
    const _context: any;
    function _resolveContext(contextName: any): Promise<any>;
    function _getOrCreateToken(config: any, options: any): Promise<any>;
    function _fromRefreshToken(ims: any, token: any, config: any): Promise<any>;
    function _generateToken(ims: any, config: any, reason: any, options: any): Promise<any>;
    /**
     * If the result is an object containing an access and refresh token,
     * the tokens are persisted back into the IMS context and the promise
     * resolves to the access token. If the result is a string, it is
     * assumed to be a valid access token to which the promise resolves.
     *
     * @param {string} context the ims context name
     * @param {object} contextData the ims context data to persist
     * @param {Promise} resultPromise the promise that contains the results (access token, or access token and refresh token)
     * @param {boolean} local whether or not the token should be persisted locally, defaults to false
     * @returns {Promise<string>} resolves to the access token
     */
    function _persistTokens(context: string, contextData: object, resultPromise: Promise<any>, local?: boolean): Promise<string>;
    /**
     * Validates the token is not expired yet and returns it if so.
     * Otherwise a rejected Promise is returned indicating that fact.
     * The token parameter is expected to be an object with two
     * properties: "token" with the actual token value which is
     * returned. The "expiry" property must be a number indicating
     * the expiry time of the token in ms since the Epoch. This time
     * must be at least 10 minutes in the future for the token to be
     * returned.
     *
     * @param {*} token The token hash
     * @returns {Promise<string>} the token if existing and not expired, else a rejected Promise
     */
    function getTokenIfValid(token: any): Promise<string>;
}
