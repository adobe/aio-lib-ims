/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { ErrorWrapper, createUpdater } = require('@adobe/aio-lib-core-errors').AioCoreSDKErrorWrapper

const codes = {}
const messages = new Map()

/**
 * Create an Updater for the Error wrapper
 */
const Updater = createUpdater(
  // object that stores the error classes (to be exported)
  codes,
  // Map that stores the error strings (to be exported)
  messages
)

/**
 * Provides a wrapper to easily create classes of a certain name, and values
 */
const E = ErrorWrapper(
  // The class name for your SDK Error. Your Error objects will be these objects
  'IMSLibError',
  // The name of your SDK. This will be a property in your Error objects
  'IMSSDK',
  // the object returned from the CreateUpdater call above
  Updater
  // the base class that your Error class is extending. AioCoreSDKError is the default
  /* , AioCoreSDKError */
)

module.exports = {
  codes,
  messages
}

// Define your error codes with the wrapper
E('UNKNOWN_AUTHCODE_TYPE', 'Unknown type of authCode: %s')
E('CANNOT_RESOLVE_ENVIRONMENT', 'Cannot resolve to IMS environment from token.')
E('INVALID_CONTEXT_DATA', 'contextData must be an object')
E('MISSING_ENVIRONMENT_VARIABLE', 'missing environment variable(s) \'%s\', are you actually in an action\'s runtime?')
E('MISSING_CONTEXT_LABEL', 'Missing IMS context label to set context data for')
E('NOT_IMPLEMENTED', 'abstract method is not implemented')
E('CONTEXT_NOT_CONFIGURED', 'IMS context \'%s\' is not configured')
E('INVALID_TOKEN', 'Token missing or expired')
E('CANNOT_GENERATE_TOKEN', 'Cannot generate token because no plugin supports configuration:\n%s')
