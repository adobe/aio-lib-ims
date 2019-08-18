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

const debug = require('debug')('@adobe/aio-cna-core-ims/context');

// Name of the IMS configuration context data structure
const IMS = '$ims';

// Property holding the current context name
const IMS_CURRENT = `${IMS}.$current`;

// Property holding the list of additional login plugins
const IMS_PLUGINS = `${IMS}.$plugins`;

/**
 * The `context` object manages the IMS configuration contexts on behalf of
 * the Adobe I/O CNA Core IMS Library.
 */
const context = {

    /**
     * Getter for the actual configuration
     * @private
     */
    get _cliConfig() {
        if (!this._config) {
            this._config = require('@adobe/aio-cna-core-config')
            this._config.reload()
        }
        return this._config
    },

    /**
     * The current context name.
     * When assigning a value, the name is persisted in the local configuration.
     * To persist the new current context name in global configuration call the
     * `setCurrent(contextName, local)` method with `local=false`.
     */
    get current() {
        debug("get current");
        return this._cliConfig.get(IMS_CURRENT);
    },

    set current(contextName) {
        debug("set current=%s", contextName);
        this.setCurrent(contextName, true);
    },

    /**
     * Sets the current context name while explicitly stating whether to
     * persist in the local or global configuration.
     *
     * @param {string} contextName The name of the context to use as the current context
     * @param {boolean} local Persist the current name in local (`true`) or
     *      global (`false`, default) configuration
     */
    setCurrent(contextName, local=false) {
        debug("setCurrent(%s, %s)", contextName, !!local);
        this._cliConfig.set(IMS_CURRENT, contextName, !!local);
    },

    /**
     * The list of additional IMS login plugins to consider.
     * The JWT and OAuth2 plugins are required by the CNA Core IMS
     * library and are always installed and used.
     * This list of plugins is always stored in the global configuration.
     */
    get plugins() {
        debug("get plugins");
        return this._cliConfig.get(IMS_PLUGINS);
    },

    set plugins(plugins) {
        debug("set plugins=%o", plugins);
        this._cliConfig.set(IMS_PLUGINS, plugins, false);
    },

    /**
     * Returns the names of the configured IMS contexts as an array of strings.
     *
     * @returns {string[]} The names of the currently known configurations.
     */
    keys() {
        debug("keys()");
        return Object.keys(this._cliConfig.get(IMS)).filter(x => !x.startsWith('$'));
    },

    /**
     * Returns an object representing the named context.
     * If the contextName parameter is empty or missing, it defaults to the
     * current context name. The result is an object with two properties:
     *
     *   - `name`: The actual context name used
     *   - `data`: The IMS context data
     *
     * @param {string} contextName Name of the context information to return.
     * @returns {object} The configuration object
     */
    get(contextName) {
        debug("get(%s)", contextName);

        if (!contextName) {
            contextName = this.current;
        }

        if (contextName) {
            return {
                name: contextName,
                data: this._cliConfig.get(`$ims.${contextName}`)
            };
        }

        // missing context and no current context
        return { name: contextName, data: undefined };
    },

    /**
     * Updates the named configuration with new configuration data.
     * If a configuration object for the named context already exists it
     * is completely replaced with this new configuration.
     *
     * @param {string} contextName Name of the context to update
     * @param {object} contextData The configuration data to store for the context
     * @param {boolean} local Persist in local (`true`) or global (`false`,
     *          default) configuration
     */
    async set(contextName, contextData, local=false) {
        debug("set(%s, %o, %s)", contextName, contextData, !!local);

        if (!contextName) {
            contextName = this.current;
        }
        if (contextName) {
            return this._cliConfig.set(`$ims.${contextName}`, contextData, !!local);
        }

        Promise.reject("Missing IMS context label to set context data for");
    }
}

module.exports = {
    context
};
