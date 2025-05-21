export type ClientCredentialsResponse = {
    /**
     * The access token issued by IMS
     */
    access_token: string;
    /**
     * The type of the token (in this case 'bearer')
     */
    token_type: string;
    /**
     * The lifetime in seconds of the access token
     */
    expires_in: number;
};
/**
 * Returns the decoded token value as JavaScript object.
 *
 * @param {string} token The token to decode and extract the token value from
 * @returns {object} The decoded token payload data without header and signature
 */
export function getTokenData(token: string): object;
/**
 * The `Ims` class wraps the IMS API.
 */
export class Ims {
    /**
     * Creates a new IMS connector instance for the stage or prod environment
     *
     * @param {string} env The name of the environment. `prod` and `stage`
     *      are the only values supported. `prod` is default and any value
     *      other than `prod` or `stage` it is assumed to be the default
     *      value of `prod`. If not set, it will get the global cli env value. See https://github.com/adobe/aio-lib-env
     *      (which defaults to `prod` as well if not set)
     * @param {ValidationCache} cache The cache instance to use.
     */
    constructor(env: string, cache: ValidationCache);
    env: string;
    endpoint: any;
    cache: ValidationCache;
    /**
     * Returns the absolute URL to call the indicated API.
     * The API is expected to be the API absolute path, such as `/ims/profile`.
     * To form the absolute URL, the scheme (`https`) and fully qualified
     * domain of the IMS host for this instance's environment is prepended
     * to the path.
     *
     * @param {string} api The API (path) for which to return the URL
     * @returns {string} The absolute URI for the IMS API
     */
    getApiUrl(api: string): string;
    /**
     * Returns the URL for the environment of this instance which allows
     * for OAuth2 based three-legged authentication with a browser for
     * an end user.
     *
     * @param {string} clientId The Client ID
     * @param {string} scopes The list of scopes to request as a blank separated list
     * @param {string} callbackUrl The callback URL after the user signed in
     * @param {string} state Any state value which is passed back from sign in
     * @returns {string} the OAuth2 login URL
     */
    getSusiUrl(clientId: string, scopes: string, callbackUrl: string, state: string): string;
    /**
     * Send a `GET` request to an IMS API with the access token sending
     * the `parameters` as request URL parameters.
     *
     * @param {string} api The IMS API to `GET` from, e.g. `/ims/profile/v1`
     * @param {string} token The IMS access token to call the API
     * @param {Map} parameters A map of request parameters
     * @returns {Promise} a promise resolving to the result of the request
     */
    get(api: string, token: string, parameters: Map<any, any>): Promise<any>;
    /**
     * Send a `POST` request to an IMS API with the access token sending
     * the `parameters` as form data.
     *
     * @param {string} api The IMS API to `POST` to, e.g. `/ims/profile/v1`
     * @param {string} token The IMS access token to call the API
     * @param {Map} parameters A map of request parameters
     * @returns {Promise} a promise resolving to the result of the request
     */
    post(api: string, token: string, parameters: Map<any, any>): Promise<any>;
    /**
     * Request the access token for the given client providing the access
     * grant in the `authCode`.
     * The promise resolve to the token result JavaScript object as follows:
     *
     * ```js
     * {
     *   access_token: {
     *     token: "eyJ4NXUiOi...6ZodTesbag",
     *     expiry: 1566242851048
     *   },
     *   refresh_token: {
     *     token: "eyJ4NXUiOi...YbT1_szWZA",
     *     expiry: 1567366051050
     *   },
     *   payload: {
     *      ...full api response...
     *   }
     * }
     * ```
     *
     * @param {string} authCode The authorization code received from the OAuth2
     *      sign in page or by some other means. This may also be a refresh
     *      token which may be traded for a new access token.
     * @param {string} clientId The Client ID
     * @param {string} clientSecret The Client Secrete proving client ID ownership
     * @param {string} scopes The list of scopes to request as a blank separated list
     * @returns {Promise} a promise resolving to a tokens object as described in the
     *      an object containing the access token and refresh token or rejects to an error message.
     */
    getAccessToken(authCode: string, clientId: string, clientSecret: string, scopes: string): Promise<any>;
    /**
     * Request an access token of the Client Credentials Grant Type.
     *
     * @param {string} clientId The Client ID
     * @param {string} clientSecret The Client Secret proving client ID ownership
     * @param {string} orgId the IMS org Id
     * @param {Array<string>} scopes The list of scopes to request as a blank separated list
     * @returns {Promise} a promise resolving to a token object as described in the
     *      {@link ClientCredentialsResponse} or rejects to an error message.
     */
    getAccessTokenByClientCredentials(clientId: string, clientSecret: string, orgId: string, scopes?: Array<string>): Promise<any>;
    /**
     * Asks for the signed JWT token to be exchanged for a valid access
     * token as well as a refresh token.
     * The promise resolve to the token result JavaScript object as follows:
     *
     * ```js
     * {
     *   access_token: {
     *     token: "eyJ4NXUiOi...6ZodTesbag",
     *     expiry: 1566242851048
     *   },
     *   payload: {
     *      ...full api response...
     *   }
     * }
     * ```
     *
     * Note that there is no `refresh_token` in a JWT token exchange.
     *
     * @param {string} clientId The client ID of the owning application
     * @param {string} clientSecret The client's secret
     * @param {string} signedJwtToken The properly signed JWT token for the JWT token exchange
     * @returns {Promise} returns a Promise that resolves to the token result object
     */
    exchangeJwtToken(clientId: string, clientSecret: string, signedJwtToken: string): Promise<any>;
    /**
     * Invalidates the given token. If the token is a refresh token, all the
     * access tokens created with that refresh token will also be invalidated
     * at the same time.
     *
     * @param {string} token the access token
     * @param {string} clientId the client id
     * @param {string} clientSecret the client secret
     * @returns {Promise} Promise that resolves with the request data
     */
    invalidateToken(token: string, clientId: string, clientSecret: string): Promise<any>;
    /**
     * Validates the given token against an allow list.
     *
     * Optional: If a cache is provided, the token will be validated against the cache first.
     *
     * Note: The cache uses the returned status key to determine if the result should be cached. This is not returned
     *       to the user.
     *
     * @param {string} token the token to validate
     * @param {Array<string>} allowList the allow list to validate against
     * @returns {Promise} Promise that resolves with the ims validation result
     */
    validateTokenAllowList(token: string, allowList: Array<string>): Promise<any>;
    /**
     * Validates the given token.
     *
     * @param {string} token the access token
     * @param {string} [clientId] the client id, optional
     * @returns {object} the server response
     */
    validateToken(token: string, clientId?: string): object;
    /**
     * Verifies a given token, returns a status which can be used to determine cache status if this function is passed to the validation cache.
     *
     * @param {string} token the access token
     * @param {string} [clientId] the client id, optional
     * @returns {object} Status code and the server response
     */
    _validateToken(token: string, clientId?: string): object;
    /**
     * Gets the IMS organizations attached to the given token.
     *
     * @param {string} token the access token
     * @returns {object} the server response
     */
    getOrganizations(token: string): object;
    /**
     * Converts the access token to a token result object as follows:
     *
     * ```js
     * {
     *   access_token: {
     *     token: "eyJ4NXUiOi...6ZodTesbag",
     *     expiry: 1566242851048
     *   }
     * }
     * ```
     *
     * The `expiry` property is the expiry time of the token in milliseconds
     * since the epoch.
     *
     * @param {string} token The access token to wrap into a token result
     * @returns {Promise} a `Promise` resolving to an object as described.
     */
    toTokenResult(token: string): Promise<any>;
}
export namespace Ims {
    /**
     * Creates an instance of the `Ims` class deriving the instance's
     * environment from the `as` claim in the provided access token.
     *
     * @param {string} token The access token from which to extract the
     *      environment to setup the `Ims` instancee.
     * @returns {Promise} A `Promise` resolving to the `Ims` instance.
     */
    function fromToken(token: string): Promise<any>;
}
/** The constant string `access_token`.  */
export const ACCESS_TOKEN: "access_token";
/** The constant string `refresh_token`.  */
export const REFRESH_TOKEN: "refresh_token";
/** The constant string `authorization_code`.  */
export const AUTHORIZATION_CODE: "authorization_code";
/** The constant string `client_id`.  */
export const CLIENT_ID: "client_id";
/** The constant string `client_secret`.  */
export const CLIENT_SECRET: "client_secret";
/** The constant string `scope`.  */
export const SCOPE: "scope";
import ValidationCache = require("./ValidationCache");
