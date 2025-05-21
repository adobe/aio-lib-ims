export = StateActionContext;
/**
 * The `StateActionContext` class stores IMS `contexts` for Adobe I/O Runtime Actions in the
 * cloud using the Adobe I/O State Library.
 */
declare class StateActionContext extends Context {
    /** @private */
    private data;
    /** @private */
    private tokensLoaded;
    /** @private */
    private state;
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
    protected override setConfigValue(key: any, value: any): Promise<void>;
    /** @private */
    private loadTokensOnce;
    /** @private */
    private hasToken;
    /** @private */
    private getStateKey;
    /** @private */
    private initStateOnce;
    /** @private */
    private deleteTokens;
    /** @private */
    private setTokens;
}
import Context = require("./Context");
