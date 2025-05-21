export = Context;
/**
 * The `Context` abstract class provides an interface to manage the IMS configuration contexts on behalf of
 * the Adobe I/O Lib IMS Library.
 */
declare class Context {
    constructor(keyNames: any);
    keyNames: any;
    /**
     * Gets the current context name.
     *
     * @returns {Promise<string>} the current context name
     */
    getCurrent(): Promise<string>;
    /**
     * Sets the current context name in the local configuration
     *
     * @param {string} contextName The name of the context to use as the current context
     * @returns {Promise<any>} returns an instance of the Config object
     */
    setCurrent(contextName: string): Promise<any>;
    /**
     * Returns an object representing the named context.
     * If the contextName parameter is empty or missing, it defaults to the
     * current context name. The result is an object with two properties:
     *
     *   - `name`: The actual context name used
     *   - `data`: The IMS context data
     *   - `local`: Whether the context data is stored locally or not
     *
     * @param {string} contextName Name of the context information to return.
     * @returns {Promise<object>} The configuration object
     */
    get(contextName: string): Promise<object>;
    /**
     * Updates the named configuration with new configuration data. If a configuration
     * object for the named context already exists it is completely replaced with this new
     * configuration.
     *
     * @param {string} contextName Name of the context to update
     * @param {object} contextData The configuration data to store for the context
     * @param {boolean} local Persist in local or global configuration. When running in
     *      Adobe I/O Runtime, this has no effect unless `contextData` contains an
     *      `access_token` or `refresh_token` field, in which case setting `local=true` will
     *      prevent the persistence of those fields in the [`State
     *      SDK`](https://github.com/adobe/aio-lib-state). Please note that when calling
     *      `getToken` in an I/O Runtime Action, generated tokens will always be persisted
     *      as `getToken` internally calls `context.set` with `local=false`.
     */
    set(contextName: string, contextData: object, local?: boolean): Promise<void>;
    /**
     * Returns the names of the configured contexts as an array of strings.
     *
     * @returns {Promise<string[]>} The names of the currently known configurations.
     */
    keys(): Promise<string[]>;
    /**
     *
     * @param {string} configName config name
     * @returns {Promise<any>} config value
     * @protected
     * @ignore
     */
    protected getConfigValue(configName: string): Promise<any>;
    /**
     * @param {string} configName config name
     * @param {any} configValue config value
     * @param {boolean} isLocal write local or not
     * @protected
     * @ignore
     */
    protected setConfigValue(configName: string, configValue: any, isLocal: boolean): Promise<void>;
    /**
     * @param {string} contextName context name
     * @returns {Promise<{data: any, local: boolean}>} context value
     * @protected
     * @ignore
     */
    protected getContextValue(contextName: string): Promise<{
        data: any;
        local: boolean;
    }>;
    /**
     * @param {string} contextName config name
     * @param {any} ctxValue config value
     * @param {boolean} isLocal write local or not
     * @protected
     * @ignore
     */
    protected setContextValue(contextName: string, ctxValue: any, isLocal: boolean): Promise<void>;
    /**
     * @ignore
     * @protected
     * @returns {Promise<string[]>} return defined contexts
     */
    protected contextKeys(): Promise<string[]>;
}
