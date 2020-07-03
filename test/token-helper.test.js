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

const { IMS_TOKEN_MANAGER } = require('../src/token-helper')
const config = require('@adobe/aio-lib-core-config')

afterEach(() => {
  jest.restoreAllMocks()
})

/** @private */
function createHandlerForContext (context = {}, imsPlugin) {
  const mappedContext = Object.keys(context)
    // prefix ims. to all the keys
    .map(key => {
      return {
        [`ims.contexts.${key}`]: context[key]
      }
    })
    // merge the objects
    .reduce((acc, cur) => {
      return Object.assign(acc, cur)
    }, {})

  const store = {
    ...mappedContext,
    'ims.config.plugins': imsPlugin ? [imsPlugin] : null
  }

  return function (key) {
    return store[key]
  }
}

test('exports', async () => {
  expect(typeof IMS_TOKEN_MANAGER).toEqual('object')
})

test('getTokenIfValid', async () => {
  // invalid token
  await expect(IMS_TOKEN_MANAGER.getTokenIfValid({})).rejects.toEqual(new Error('Token missing or expired'))

  // valid token
  const token = {
    token: 'abcdefghijklmnop',
    expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
  }
  await expect(IMS_TOKEN_MANAGER.getTokenIfValid(token)).resolves.toEqual(token.token)
})

test('getToken - string', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      foo: 'bar',
      returnType: 'string',
      expired: 'no'
    }
  }

  // known context, handled by ./test/ims-plugins/imsPlugin
  config.get.mockImplementation(
    createHandlerForContext(context, '../test/ims-plugins/imsPlugin')
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')

  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('getToken - object', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      foo: 'bar',
      returnType: 'object',
      expired: 'no',
      refresh_token: {
        token: 'abcd123',
        expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
      }
    }
  }

  // known context, handled by ./test/ims-plugins/imsPlugin
  config.get.mockImplementation(
    createHandlerForContext(context, '../test/ims-plugins/imsPlugin')
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')
  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('getToken - object (refresh token expired)', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      foo: 'bar',
      returnType: 'object',
      expired: 'refresh_token'
    }
  }

  // known context, handled by ./test/ims-plugins/imsPlugin
  config.get.mockImplementation(
    createHandlerForContext(context, '../test/ims-plugins/imsPlugin')
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')
  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('invalidateToken - has access and refresh token', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      foo: 'bar',
      returnType: 'object',
      expired: 'no',
      access_token: {
        token: 'abcd123',
        expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
      },
      refresh_token: {
        token: 'wxyz123',
        expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
      }
    }
  }

  // known context, handled by ./test/ims-plugins/imsPlugin
  config.get.mockImplementation(
    createHandlerForContext(context, '../test/ims-plugins/imsPlugin')
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).resolves.not.toThrow()

  // force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, true)).resolves.not.toThrow()
})

test('invalidateToken - unknown context', async () => {
  const contextName = 'unknown-context'
  const context = {}

  // unknown context
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toEqual(new Error(`IMS context '${contextName}' is not configured`))
  // force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toEqual(new Error(`IMS context '${contextName}' is not configured`))
})

test('invalidateToken - token missing or expired', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      foo: 'bar',
      returnType: 'object'
    }
  }

  // known context, handled by ./test/ims-plugins/imsPlugin
  config.get.mockImplementation(
    createHandlerForContext(context, '../test/ims-plugins/imsPlugin')
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toEqual(new Error('Token missing or expired'))
  // force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, true)).rejects.toEqual(new Error('Token missing or expired'))
})

test('getToken - unknown plugin', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      foo: 'bar'
    }
  }

  // plugin not specified
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false))
    .rejects.toEqual(new Error('Cannot generate token because no plugin supports configuration'))
})

test('getToken - bad ims plugin, throws exception (coverage)', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      bar: 'foo'
    }
  }

  config.get.mockImplementation(
    createHandlerForContext(context, '../test/ims-plugins/badImsPlugin')
  )

  // `supports` function throws an exception
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false))
    .rejects.toEqual(new Error('Cannot generate token because no plugin supports configuration'))
})

test('getToken - incomplete ims plugin (coverage)', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      somekey: 'xyz'
    }
  }

  config.get.mockImplementation(
    createHandlerForContext(context, '../test/ims-plugins/incompleteImsPlugin')
  )

  // imsLogin function is missing
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false))
    .rejects.toEqual(new Error('Cannot generate token because no plugin supports configuration'))
})
