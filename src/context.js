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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-ims:context', { provider: 'debug' })
const ActionContext = require('./ctx/StateActionContext')
const CliContext = require('./ctx/ConfigCliContext')

/** Name of context type action */
const TYPE_ACTION = 'action'

/** Name of context type cli */
const TYPE_CLI = 'cli'

/** Name of the IMS configuration context data structure */
const IMS = 'ims'

/** Property holding an object with all contexts */
const CONTEXTS = 'contexts'

/** Property holding an object with context management configuration */
const CONFIG = 'config'

/** Property holding the cli context name */
const CLI = 'cli'

/** Property holding the current context name */
const CURRENT = 'current'

/** @private */
function guessContextType () {
  if (process.env.__OW_ACTION_NAME) {
    aioLogger.debug(`guessing context type: ${TYPE_ACTION}`)
    return TYPE_ACTION
  }
  aioLogger.debug(`guessing context type: ${TYPE_CLI}`)
  return TYPE_CLI
}

let context = null
/** @private */
function getContext () {
  if (!context) {
    if (guessContextType() === TYPE_ACTION) {
      context = new ActionContext({ IMS, CONTEXTS, CONFIG, CURRENT })
    } else {
      context = new CliContext({ IMS, CONTEXTS, CONFIG, CURRENT, CLI })
    }
  }
  return context
}

/** @private */
function resetContext () {
  context = null
}

module.exports = {
  resetContext,
  getContext,
  TYPE_ACTION,
  TYPE_CLI,
  IMS,
  CURRENT,
  CLI,
  CONTEXTS,
  CONFIG
}
