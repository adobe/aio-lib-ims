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

const mockExponentialBackoff = jest.fn()
jest.mock('@adobe/aio-lib-core-networking', () => ({
  exponentialBackoff: mockExponentialBackoff
}))

const IMS_PLUGINS = {
  cli: {
    module: '@adobe/aio-lib-ims-oauth/src/ims-cli',
    imsLogin: jest.fn()
  },
  jwt: {
    module: '@adobe/aio-lib-ims-jwt',
    imsLogin: jest.fn()
  },
  oauth: {
    module: '@adobe/aio-lib-ims-oauth',
    imsLogin: jest.fn()
  }
}

for (const key in IMS_PLUGINS) {
  (function (mockModule, mockLogin) {
    jest.mock(mockModule, () => ({
      canSupport: jest.requireActual(mockModule).canSupport,
      supports: jest.requireActual(mockModule).supports,
      imsLogin: mockLogin
    }))
  }(IMS_PLUGINS[key].module, IMS_PLUGINS[key].imsLogin))
}

const setImsPluginMock = (plugin, token) => {
  const mockFunction = IMS_PLUGINS[plugin].imsLogin
  if (typeof token === 'function') {
    mockFunction.mockImplementation(token)
  } else {
    mockFunction.mockResolvedValue(token)
  }
}

const { IMS_TOKEN_MANAGER } = require('../src/token-helper')
const config = require('@adobe/aio-lib-core-config')

// ////////////////////////////////////////////

beforeEach(() => {
  for (const key in IMS_PLUGINS) {
    const { imsLogin } = IMS_PLUGINS[key]
    imsLogin.mockRestore()
  }
})

afterEach(() => {
  jest.restoreAllMocks()
})

/** @private */
function createHandlerForContext (context = {}) {
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
    ...mappedContext
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
  await expect(IMS_TOKEN_MANAGER.getTokenIfValid({})).rejects.toThrow('[IMSSDK:INVALID_TOKEN] Token missing or expired')

  // valid token
  let token = {
    token: 'abcdefghijklmnop',
    expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
  }
  await expect(IMS_TOKEN_MANAGER.getTokenIfValid(token)).resolves.toEqual(token.token)

  // expiry as string
  token = {
    token: 'abcdefghijklmnop',
    expiry: (Date.now() + 20 * 60 * 1000).toString()
  }
  await expect(IMS_TOKEN_MANAGER.getTokenIfValid(token)).resolves.toEqual(token.token)
})

test('getToken - string (jwt)', async () => {
  const contextName = 'known-context-jwt'
  const context = {
    [contextName]: {
      client_id: 'bar',
      client_secret: 'baz',
      technical_account_id: 'foo@bar',
      meta_scopes: [],
      ims_org_id: 'ABCDEFG',
      private_key: 'XYXYXYX'
    }
  }

  setImsPluginMock('jwt', 'abc123')
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')

  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('getToken - string (oauth)', async () => {
  const contextName = 'known-context-oauth'
  const context = {
    [contextName]: {
      client_id: 'bar',
      client_secret: 'baz',
      redirect_uri: 'url',
      scope: []
    }
  }

  setImsPluginMock('oauth', 'abc123')
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')

  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('getToken - string (cli)', async () => {
  const contextName = 'known-context-oauth'
  const context = {
    [contextName]: {
      'cli.bare-output': true
    }
  }

  setImsPluginMock('cli', 'abc123')
  config.get.mockImplementation(
    createHandlerForContext(context)
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
      client_id: 'bar',
      client_secret: 'baz',
      technical_account_id: 'foo@bar',
      meta_scopes: [],
      ims_org_id: 'ABCDEFG',
      private_key: 'XYXYXYX',
      refresh_token: {
        token: 'abcd123',
        expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
      }
    }
  }

  setImsPluginMock('jwt', 'abc123')
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')
  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('getToken - object (refresh token expired, coverage)', async () => {
  const contextName = 'known-context'

  // eslint-disable-next-line camelcase
  const access_token = {
    token: 'tabcd123',
    expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
  }
  // eslint-disable-next-line camelcase
  const refresh_token = {
    token: 'wxyz123',
    expiry: Date.now() - 20 * 60 * 1000 // 20 minutes back
  }

  const context = {
    [contextName]: {
      client_id: 'bar',
      client_secret: 'baz',
      technical_account_id: 'foo@bar',
      meta_scopes: [],
      ims_org_id: 'ABCDEFG',
      private_key: 'XYXYXYX'
    }
  }

  const result = {
    access_token,
    refresh_token
  }

  setImsPluginMock('jwt', result)
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual(access_token.token)
  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual(access_token.token)
})

test('getToken - object (refresh token ok, coverage)', async () => {
  const contextName = 'known-context'

  // eslint-disable-next-line camelcase
  const access_token = {
    token: 'tabcd123',
    expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
  }
  // eslint-disable-next-line camelcase
  const refresh_token = {
    token: 'rwxyz123',
    expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
  }

  const context = {
    [contextName]: {
      client_id: 'bar',
      client_secret: 'baz',
      technical_account_id: 'foo@bar',
      meta_scopes: [],
      ims_org_id: 'ABCDEFG',
      private_key: 'XYXYXYX'
    }
  }

  const result = {
    access_token,
    refresh_token
  }

  setImsPluginMock('jwt', result)
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual(access_token.token)
  // force
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual(access_token.token)
})

test('invalidateToken - has access and refresh token', async () => {
  const contextName = 'known-context'
  // eslint-disable-next-line camelcase
  const access_token = {
    token: 'tabcd123.ewogInR5cGUiOiAiYWNjZXNzIHRva2VuIiwKICJ0b2tlbiI6ICJhYmMxMjMiCn0=.123',
    expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
  }
  // eslint-disable-next-line camelcase
  const refresh_token = {
    token: 'wxyz123.ewogInR5cGUiOiAicmVmcmVzaCB0b2tlbiIsCiAidG9rZW4iOiAiYWJjMTIzIgp9.123',
    expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
  }

  const context = {
    [contextName]: {
      client_id: 'bar',
      client_secret: 'baz',
      technical_account_id: 'foo@bar',
      meta_scopes: [],
      ims_org_id: 'ABCDEFG',
      private_key: 'XYXYXYX',
      access_token,
      refresh_token
    }
  }

  setImsPluginMock('jwt', {})
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  const res = {
    status: 200,
    text: () => Promise.resolve(true)
  }

  mockExponentialBackoff.mockImplementation(() => Promise.resolve(res))

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
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toThrow(`[IMSSDK:CONTEXT_NOT_CONFIGURED] IMS context '${contextName}' is not configured`)
  // force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toThrow(`[IMSSDK:CONTEXT_NOT_CONFIGURED] IMS context '${contextName}' is not configured`)
})

test('invalidateToken - token missing or expired', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      client_id: 'bar',
      client_secret: 'baz',
      technical_account_id: 'foo@bar',
      meta_scopes: [],
      ims_org_id: 'ABCDEFG',
      private_key: 'XYXYXYX'
    }
  }

  setImsPluginMock('jwt', {})
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // no force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toThrow('[IMSSDK:INVALID_TOKEN] Token missing or expired')
  // force
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, true)).rejects.toThrow('[IMSSDK:INVALID_TOKEN] Token missing or expired')
})

test('getToken - unknown plugin', async () => {
  const contextName = 'known-context-unknown-plugin'
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
    .rejects.toThrow('[IMSSDK:CANNOT_GENERATE_TOKEN] Cannot generate token because no plugin supports configuration:')
})

test('getToken - bad ims plugin, throws exception (coverage)', async () => {
  const contextName = 'known-context'
  const context = {
    [contextName]: {
      client_id: 'bar',
      client_secret: 'baz',
      technical_account_id: 'foo@bar',
      meta_scopes: [],
      ims_org_id: 'ABCDEFG',
      private_key: 'XYXYXYX'
    }
  }

  setImsPluginMock('jwt', () => { throw new Error('some error') }, null)
  config.get.mockImplementation(
    createHandlerForContext(context)
  )

  // `supports` function throws an exception
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false))
    .rejects.toThrow('[IMSSDK:CANNOT_GENERATE_TOKEN] Cannot generate token because no plugin supports configuration:')
})
