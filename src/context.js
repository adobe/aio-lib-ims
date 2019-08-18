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

const IMS = '$ims';
const IMS_CURRENT = `${IMS}.$current`;
const IMS_PLUGINS = `${IMS}.$plugins`;

class Context {

    get _cliConfig() {
        if (!this._config) {
            this._config = require('@adobe/aio-cli-config')
            this._config.reload()
        }
        return this._config
    }

    /**
     * The current context name.
     * When assigning a value, the name is persisted in the local
     * configuration. To persist the new current context name in
     * global configuration call the setCurrent(contextName, local)
     * method with local=false.
     */
    get current() {
        debug("get current");
        return this._cliConfig.get(IMS_CURRENT);
    }

    set current(contextName) {
        debug("set current=%s", contextName);
        this.setCurrent(contextName, true);
    }

    setCurrent(contextName, local=false) {
        debug("setCurrent(%s, %s)", contextName, !!local);
        this._cliConfig.set(IMS_CURRENT, contextName, !!local);
    }

    get plugins() {
        debug("get plugins");
        return this._cliConfig.get(IMS_PLUGINS);
    }

    set plugins(plugins) {
        debug("set plugins=%o", plugins);
        this.setPlugins(plugins, true);
    }

    /**
     *
     * @param {string[]} plugins The array of plugin names used for creating access tokens
     * @param {boolean} local Whether to store this as local (true) or global (false) configuration
     */
    setPlugins(plugins, local=false) {
        debug("setPlugins(%o, %s)", plugins, !!local);
        this._cliConfig.set(IMS_PLUGINS, plugins, !!local);
    }

    /**
     * Returns the names of the configured IMS contexts as an array of strings.
     */
    keys() {
        debug("keys()");
        return Object.keys(this._cliConfig.get(IMS)).filter(x => !x.startsWith('$'));
    }

    /**
     * Returns an object representing the named context.
     * If the contextName parameter is empty or missing, it defaults to the
     * current context name. The result is an object with two properties:
     *
     *   - name: The actual context name used
     *   - data: The IMS context data
     *
     * @param {string} contextName Name of the context information to return.
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
    }

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
    context: new Context()
};
