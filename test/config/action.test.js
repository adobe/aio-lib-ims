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

const ActionConfig = require('../../src/config/action')

const mockState = {
  get: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}
jest.mock('@adobe/aio-lib-state', () => ({
  init: () => mockState
}))

const DATE_NOW = 100000
const DateNowFunc = Date.now
Date.now = () => DATE_NOW

beforeEach(() => {
  mockState.get.mockReset()
  mockState.delete.mockReset()
  mockState.put.mockReset()
  process.env.__OW_ACTION_NAME = 'fake/pkg/action' // important keep path like structure with /
  process.env.__OW_NAMESPACE = 'fake'
  process.env.__OW_API_KEY = 'fake'
})

afterAll(() => {
  Date.now = DateNowFunc
})

test('constructor', async () => {
  const config = new ActionConfig('imsKey')
  expect(config._data).toEqual({})
  expect(config._state).toEqual(null)
  expect(config._tokensLoaded).toEqual(false)
})

test('constructor missing __OW_ACTION_NAME ENV', () => {
  delete process.env.__OW_ACTION_NAME
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_ACTION_NAME\'')
})

test('constructor missing __OW_NAMESPACE ENV', () => {
  delete process.env.__OW_NAMESPACE
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_NAMESPACE\'')
})
test('constructor missing __OW_API_KEY ENV', () => {
  delete process.env.__OW_API_KEY
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_API_KEY\'')
})

test('constructor missing __OW_NAMESPACE,__OW_ACTION_NAME,__OW_API_KEY ENV', () => {
  delete process.env.__OW_NAMESPACE
  delete process.env.__OW_ACTION_NAME
  delete process.env.__OW_API_KEY
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_ACTION_NAME,__OW_NAMESPACE,__OW_API_KEY\'')
})

test('get($notacontext), no data', async () => {
  const config = new ActionConfig('imsKey')

  await expect(config.get('$notacontext')).resolves.toBeUndefined()
})

test('get($notacontext), some data', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { $notacontext: 'data' }
  await expect(config.get('$notacontext')).resolves.toEqual('data')
})

test('set($notacontext, data)', async () => {
  const config = new ActionConfig('imsKey')

  await expect(config.set('$notacontext', 'data')).resolves.toBeUndefined()
  expect(config._data.$notacontext).toEqual('data')
})

test('get(cow), no data, no tokens', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.get('cow')).resolves.toBeUndefined()
  // no context no token loaded, but state instance is defined
  expect(mockState.get).not.toHaveBeenCalled()
  expect(config._state).not.toEqual(null)
})

test('get(cow) twice, some data with 2 contexts, no tokens', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { cow: 'data', sheep: 'data2', $notcontext: 'data3' }

  await expect(config.get('cow')).resolves.toEqual('data')
  // should load tokens for each context once
  expect(config._state).not.toEqual(null)
  expect(mockState.get).toHaveBeenCalledTimes(2)
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow')
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.sheep')
  // when calling get again we shouldn't get tokens again
  await expect(config.get('cow')).resolves.toEqual('data')
  mockState.get.mockReset()
  expect(mockState.get).not.toHaveBeenCalled()
})

test('get(cow) twice, some data, some tokens', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 1 }, sheep: { data: 2 } }
  mockState.get.mockResolvedValue({ value: { access_token: 'abc', refresh_token: 'def' } })

  await expect(config.get('cow')).resolves.toEqual({ data: 1, access_token: 'abc', refresh_token: 'def' })
  // should load tokens for each context once
  expect(config._state).not.toEqual(null)
  expect(mockState.get).toHaveBeenCalledTimes(2)
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow')
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.sheep')
  // when calling get again we shouldn't get tokens again
  await expect(config.get('cow')).resolves.toEqual({ data: 1, access_token: 'abc', refresh_token: 'def' })
  await expect(config.get('sheep')).resolves.toEqual({ data: 2, access_token: 'abc', refresh_token: 'def' })
  mockState.get.mockReset()
  expect(mockState.get).not.toHaveBeenCalled()
})

test('get(cow) twice, some data, state with no token data', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 1 }, sheep: { data: 2 } }
  mockState.get.mockResolvedValue({ value: { yolo_config: 'be' } })

  await expect(config.get('cow')).resolves.toEqual({ data: 1 })
  // should load tokens for each context once
  expect(config._state).not.toEqual(null)
  expect(mockState.get).toHaveBeenCalledTimes(2)
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow')
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.sheep')
  // when calling get again we shouldn't get tokens again
  await expect(config.get('cow')).resolves.toEqual({ data: 1 })
  await expect(config.get('sheep')).resolves.toEqual({ data: 2 })
  mockState.get.mockReset()
  expect(mockState.get).not.toHaveBeenCalled()
})

test('set(cow, { data: 1 }) with no previous data', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.set('cow', { data: 1 })).resolves.toBeUndefined()
  expect(mockState.put).not.toHaveBeenCalled()
  expect(config._state).toEqual(null)
  expect(config._data).toEqual({ cow: { data: 1 } })
})

test('set(cow, { data: 1 }) and previous data = { cow: { data: 2 }, sheep: { data: 2 } }', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 2 }, sheep: { data: 2 } }
  await expect(config.set('cow', { data: 1 })).resolves.toBeUndefined()
  expect(mockState.put).not.toHaveBeenCalled()
  expect(config._state).toEqual(null)
  expect(config._data).toEqual({ cow: { data: 1 }, sheep: { data: 2 } })
})

test('set($cow, { data: 1 }) with no previous data', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.set('$cow', { data: 1 })).resolves.toBeUndefined()
  // no context no token stored
  expect(mockState.put).not.toHaveBeenCalled()
  expect(config._state).toEqual(null)
  expect(config._data).toEqual({ $cow: { data: 1 } })
})

test('set($cow, { data: 1 }) and previous data = { $cow: { data: 2 }, cow: { data: 2 } }', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { $cow: { data: 2 }, cow: { data: 2 } }
  await expect(config.set('$cow', { data: 1 })).resolves.toBeUndefined()
  // no context no token stored
  expect(mockState.put).not.toHaveBeenCalled()
  expect(config._state).toEqual(null)
  expect(config._data).toEqual({ $cow: { data: 1 }, cow: { data: 2 } })
})

test('set(cow, { data:1, access_token: { token: hello, expiry: 1000 } }) with no previous data', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.set('cow', { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } })).resolves.toBeUndefined()
  expect(config._state).toBeDefined()
  // ttl = 1000ms = 1sec (ttl in sec, while expiry in ms)
  expect(mockState.put).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow', { access_token: { token: 'hello', expiry: DATE_NOW + 1000 } }, { ttl: 1 })
  expect(config._data).toEqual({ cow: { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } } })
})

test('set(cow, { data:1, access_token: { token: hello, expiry: +1000 } }) previous data = { cow: { data: 2 } }', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 2 } }
  await expect(config.set('cow', { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } })).resolves.toBeUndefined()
  expect(config._state).toBeDefined()
  // ttl = 1000ms = 1sec (ttl in sec, while expiry in ms)
  expect(mockState.put).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow', { access_token: { token: 'hello', expiry: DATE_NOW + 1000 } }, { ttl: 1 })
  expect(config._data).toEqual({ cow: { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } } })
})

test('set(cow, { data:1 }) and previous data = { cow: { data: 2 }, access_token: { token: hello, expiry: 1000 } } }', async () => {
  // in that case we should delete the tokens
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 2, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } } }
  await expect(config.set('cow', { data: 1 })).resolves.toBeUndefined()
  expect(config._state).toBeDefined()
  expect(mockState.delete).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow')
  expect(config._data).toEqual({ cow: { data: 1 } })
})

test('set(cow, { data:1, access_token: { token: hello, expiry: +1000 } }, refresh_token: { token: hello2, expiry: +2000 } }) with no previous data', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.set('cow', { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 }, refresh_token: { token: 'hello2', expiry: DATE_NOW + 2000 } })).resolves.toBeUndefined()
  expect(config._state).toBeDefined()
  // take biggest ttl 2000ms = 1s
  expect(mockState.put).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow', { access_token: { token: 'hello', expiry: DATE_NOW + 1000 }, refresh_token: { token: 'hello2', expiry: DATE_NOW + 2000 } }, { ttl: 2 })
  expect(config._data).toEqual({ cow: { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 }, refresh_token: { token: 'hello2', expiry: DATE_NOW + 2000 } } })
})

test('set(cow, { data:1, refresh_token: { token: hello2, expiry: +2000 } }) and previous data = { cow: { data: 2 }, access_token: { token: hello, expiry: 1000 } } }', async () => {
  // in that case we should update the state with new ttl and tokens
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 2, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } } }
  await expect(config.set('cow', { data: 1, refresh_token: { token: 'hello2', expiry: DATE_NOW + 2000 } })).resolves.toBeUndefined()
  expect(config._state).toBeDefined()
  expect(mockState.put).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow', { refresh_token: { token: 'hello2', expiry: DATE_NOW + 2000 } }, { ttl: 2 })
  expect(config._data).toEqual({ cow: { data: 1, refresh_token: { token: 'hello2', expiry: DATE_NOW + 2000 } } })
})

test('set(cow, { data:1, access_token: { token: hello2, expiry: +2000 } }) and previous data = { cow: { data: 2 }, access_token: { token: hello, expiry: 1000 } } }', async () => {
  // in that case we should update the state with new ttl and tokens
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 2, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } } }
  await expect(config.set('cow', { data: 1, access_token: { token: 'hello2', expiry: DATE_NOW + 2000 } })).resolves.toBeUndefined()
  expect(config._state).toBeDefined()
  expect(mockState.put).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow', { access_token: { token: 'hello2', expiry: DATE_NOW + 2000 } }, { ttl: 2 })
  expect(config._data).toEqual({ cow: { data: 1, access_token: { token: 'hello2', expiry: DATE_NOW + 2000 } } })
})

test('set(cow, { data:1, access_token: { token: hello, expiry: 1000 } }, true) [local=true=nocaching]', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.set('cow', { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } }, true)).resolves.toBeUndefined()
  expect(config._state).toBeNull()
  expect(mockState.put).not.toHaveBeenCalled()
  expect(config._data).toEqual({ cow: { data: 1, access_token: { token: 'hello', expiry: DATE_NOW + 1000 } } })
})
