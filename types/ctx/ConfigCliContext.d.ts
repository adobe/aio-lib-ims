export = ConfigCliContext;
/**
 * The `ConfigCliContext` class stores IMS `contexts` for the Adobe I/O CLI in the local file
 * system using the Adobe I/O Core Configuration Library.
 */
declare class ConfigCliContext extends Context {
    /** @private */
    private aioConfig;
    /**
     * Gets the cli context data
     *
     * @returns {Promise<any>} the cli context data
     */
    getCli(): Promise<any>;
    /**
     * Sets the cli context data
     *
     * @param {object} contextData the data to save
     * @param {boolean} [local=false] set to true to save to local config, false for global config
     * @param {boolean} [merge=true] set to true to merge existing data with the new data
     */
    setCli(contextData: object, local?: boolean, merge?: boolean): Promise<void>;
    /**
     * @protected
     * @override
     * @ignore
     */
    protected override getContextValue(key: any): Promise<{
        data: any;
        local: boolean;
    }>;
    /**
     * @protected
     * @override
     * @ignore
     */
    protected override getConfigValue(key: any): Promise<any>;
    /**
     * @protected
     * @override
     * @ignore
     */
    protected override setContextValue(key: any, value: any, isLocal: any): Promise<void>;
    /**
     * @protected
     * @override
     * @ignore
     */
    protected override setConfigValue(key: any, value: any, isLocal: any): Promise<void>;
    /** @private */
    private getContextValueFromOptionalSource;
}
import Context = require("./Context");
