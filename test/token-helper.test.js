/*
Copyright 2019 Adobe. All rights reserved.
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
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        foo: 'bar',
        returnType: 'string',
        expired: 'no'
      }
    } else if (key === '$ims.$plugins') {
      return ['../test/ims-plugins/imsPlugin']
    }
  })

  // // unknown context
  let contextName = 'unknown-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).rejects.toEqual(new Error(`IMS context '${contextName}' is not configured`))

  // known context, handled by ./test/ims-plugins/imsPlugin
  contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')

  // known context, handled by ./test/ims-plugins/imsPlugin (force)
  contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('getToken - object', async () => {
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        foo: 'bar',
        returnType: 'object',
        expired: 'no',
        refresh_token: {
          token: 'abcd123',
          expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
        }
      }
    } else if (key === '$ims.$plugins') {
      return ['../test/ims-plugins/imsPlugin']
    }
  })

  // known context, handled by ./test/ims-plugins/imsPlugin (force)
  const contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false)).resolves.toEqual('abc123')
})

test('getToken - object (refresh token expired)', async () => {
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        foo: 'bar',
        returnType: 'object',
        expired: 'refresh_token'
      }
    } else if (key === '$ims.$plugins') {
      return ['../test/ims-plugins/imsPlugin']
    }
  })

  // known context, handled by ./test/ims-plugins/imsPlugin (force)
  const contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, true)).resolves.toEqual('abc123')
})

test('invalidateToken', async () => {
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        foo: 'bar',
        returnType: 'string',
        expired: 'no',
        access_token: {
          token: 'abcd123',
          expiry: Date.now() + 20 * 60 * 1000 // 20 minutes from now
        }
      }
    } else if (key === '$ims.$plugins') {
      return ['../test/ims-plugins/imsPlugin']
    }
  })

  // unknown context
  let contextName = 'unknown-context'
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toEqual(new Error(`IMS context '${contextName}' is not configured`))

  // known context, handled by ./test/ims-plugins/imsPlugin
  contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).resolves.not.toThrow()

  // known context, handled by ./test/ims-plugins/imsPlugin (force)
  contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, true)).resolves.not.toThrow()
})

test('invalidateToken - expired', async () => {
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        foo: 'bar',
        returnType: 'string',
        expired: 'no',
        access_token: {
          token: 'abcd123',
          expiry: Date.now() - 5000 // in the past
        }
      }
    } else if (key === '$ims.$plugins') {
      return ['../test/ims-plugins/imsPlugin']
    }
  })

  // known context, handled by ./test/ims-plugins/imsPlugin (no force)
  const contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.invalidateToken(contextName, false)).rejects.toEqual(new Error('Token missing or expired'))
})

test('getToken - unknown plugin', async () => {
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        foo: 'bar'
      }
    } else if (key === '$ims.$plugins') {
      return null
    }
  })

  // plugin not specified
  const contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false))
    .rejects.toEqual(new Error('Cannot generate token because no plugin supports configuration'))
})

test('getToken - bad plugin', async () => {
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        bar: 'foo'
      }
    } else if (key === '$ims.$plugins') {
      return ['../test/ims-plugins/badImsPlugin']
    }
  })

  // coverage: bad plugin, supports function throws an exception
  const contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false))
    .rejects.toEqual(new Error('Cannot generate token because no plugin supports configuration'))
})

test('getToken - incomplete plugin', async () => {
  config.get.mockImplementation(key => {
    if (key === '$ims.known-context') {
      return {
        somekey: 'xyz'
      }
    } else if (key === '$ims.$plugins') {
      return ['../test/ims-plugins/incompleteImsPlugin']
    }
  })

  // coverage: incomplete plugin
  const contextName = 'known-context'
  await expect(IMS_TOKEN_MANAGER.getToken(contextName, false))
    .rejects.toEqual(new Error('Cannot generate token because no plugin supports configuration'))
})
