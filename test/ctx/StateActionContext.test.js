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

const mockStateInstance = {
  get: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}
jest.mock('@adobe/aio-lib-state', () => ({
  init: jest.fn().mockResolvedValue(mockStateInstance)
}))
const mockState = require('@adobe/aio-lib-state')

jest.mock('lodash.clonedeep', () => jest.fn().mockImplementation(v => v))
const cloneDeep = require('lodash.clonedeep')

const TheContext = require('../../src/ctx/StateActionContext')

const DATE_NOW = 100000
const DateNowFunc = Date.now
Date.now = () => DATE_NOW

beforeEach(() => {
  mockState.init.mockClear()
  mockStateInstance.get.mockReset()
  mockStateInstance.delete.mockReset()
  mockStateInstance.put.mockReset()
  process.env.__OW_ACTION_NAME = 'fakens/pkg/action' // important keep path like structure with /
  process.env.__OW_NAMESPACE = 'fakens'
  process.env.__OW_API_KEY = 'fakeapikey'
  cloneDeep.mockClear()
})

afterAll(() => {
  Date.now = DateNowFunc
})

const keyNames = {
  IMS: 'a',
  CONFIG: 'b',
  CONTEXTS: 'c',
  CURRENT: 'd',
  PLUGINS: 'e'
}

let context
beforeEach(() => {
  context = new TheContext(keyNames)
})

describe('constructor', () => {
  test('({ CONFIG: the, CONTEXTS: dude, fake: key })', () => {
    const context = new TheContext({ CONFIG: 'the', CONTEXTS: 'dude', fake: 'key' })
    expect(context.keyNames).toEqual({ CONFIG: 'the', CONTEXTS: 'dude', fake: 'key' })
    expect(context.data).toEqual({ the: {}, dude: {} })
    expect(context.state).toEqual(null)
  })
  test('missing __OW_ACTION_NAME ENV', () => {
    delete process.env.__OW_ACTION_NAME
    expect(() => new TheContext(keyNames)).toThrow('missing environment variable(s) \'__OW_ACTION_NAME\'')
  })
  test('missing __OW_NAMESPACE ENV', () => {
    delete process.env.__OW_NAMESPACE
    expect(() => new TheContext(keyNames)).toThrow('missing environment variable(s) \'__OW_NAMESPACE\'')
  })
  test('missing __OW_API_KEY ENV', () => {
    delete process.env.__OW_API_KEY
    expect(() => new TheContext(keyNames)).toThrow('missing environment variable(s) \'__OW_API_KEY\'')
  })
  test('missing __OW_NAMESPACE,__OW_ACTION_NAME,__OW_API_KEY ENV', () => {
    delete process.env.__OW_NAMESPACE
    delete process.env.__OW_ACTION_NAME
    delete process.env.__OW_API_KEY
    expect(() => new TheContext(keyNames)).toThrow('missing environment variable(s) \'__OW_ACTION_NAME,__OW_NAMESPACE,__OW_API_KEY\'')
  })
})

describe('getConfigValue', () => {
  test('key=fake', async () => {
    context.data[keyNames.CONFIG].fake = 'value'
    await expect(context.getConfigValue('fake')).resolves.toEqual('value')
    expect(cloneDeep).toHaveBeenCalledWith('value')
    // does not interact with state
    expect(mockState.init).toHaveBeenCalledTimes(0)
    expect(context.state).toEqual(null)
  })
})

describe('setConfigValue', () => {
  test('key=fake, value', async () => {
    await expect(context.setConfigValue('fake', 'value')).resolves.toEqual(undefined)
    expect(cloneDeep).toHaveBeenCalledWith('value')
    expect(context.data[keyNames.CONFIG].fake).toEqual('value')
    // does not interact with state
    expect(mockState.init).toHaveBeenCalledTimes(0)
    expect(context.state).toEqual(null)
  })
})

describe('getContextValue', () => {
  test('key=fake, context data = {}, no state tokens', async () => {
    await expect(context.getContextValue('fake')).resolves.toEqual(undefined)
    // does interact with state
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
  })
  test('2 calls: key=fake, context data = {}, no state tokens', async () => {
    await expect(context.getContextValue('fake')).resolves.toEqual(undefined)
    await expect(context.getContextValue('fake')).resolves.toEqual(undefined)
    // does interact with state, make sure we init once only
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
  })
  test('key=fake, context data = { fake: value }, no state tokens', async () => {
    context.data[keyNames.CONTEXTS].fake = 'value'
    await expect(context.getContextValue('fake')).resolves.toEqual('value')
    expect(cloneDeep).toHaveBeenCalledWith('value')
    // does interact with state
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
    expect(mockStateInstance.get).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake`)
  })
  test('key=fake, context data = { fake: value, fake2: value2 }, no state tokens', async () => {
    context.data[keyNames.CONTEXTS].fake = 'value'
    context.data[keyNames.CONTEXTS].fake2 = 'value2'
    await expect(context.getContextValue('fake')).resolves.toEqual('value')
    expect(cloneDeep).toHaveBeenCalledWith('value')
    // does interact with state twice
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
    expect(mockStateInstance.get).toHaveBeenCalledTimes(2)
    expect(mockStateInstance.get).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake`)
    expect(mockStateInstance.get).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake2`)
  })
  test('key=fake, context data = { fake: { the: value}, fake2: { the: value2 }, fake3: { the: value3 } }, state tokens for fake and fake2 and fake3', async () => {
    context.data[keyNames.CONTEXTS].fake = { the: 'value' }
    context.data[keyNames.CONTEXTS].fake2 = { the: 'value2' }
    context.data[keyNames.CONTEXTS].fake3 = { the: 'value3' }

    mockStateInstance.get.mockImplementation(k => {
      if (k.endsWith('fake')) return { value: { access_token: 123, refresh_token: 456, other: 'dontcare' } }
      if (k.endsWith('fake2')) return { value: { access_token: 789, other: 'dontcare' } }
      if (k.endsWith('fake3')) return { value: { refresh_token: 120, other: 'dontcare' } }
    })
    await expect(context.getContextValue('fake')).resolves.toEqual({ the: 'value', access_token: 123, refresh_token: 456 })
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value', access_token: 123, refresh_token: 456 })
    // does interact with state twice
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
    expect(mockStateInstance.get).toHaveBeenCalledTimes(3)
    expect(mockStateInstance.get).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake`)
    expect(mockStateInstance.get).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake2`)
    expect(mockStateInstance.get).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake3`)
    expect(context.data[keyNames.CONTEXTS]).toEqual({
      fake: { the: 'value', access_token: 123, refresh_token: 456 },
      fake2: { the: 'value2', access_token: 789 },
      fake3: { the: 'value3', refresh_token: 120 }
    })
  })
})

describe('setContextValue', () => {
  test('key=fake, value={ the: value }, context data = {}', async () => {
    cloneDeep.mockReturnValue('clonedData')
    await expect(context.setContextValue('fake', { the: 'value' })).resolves.toEqual(undefined)
    expect(context.state).toBe(null)
    expect(mockState.init).toHaveBeenCalledTimes(0)
    expect(context.data[keyNames.CONTEXTS]).toEqual({ fake: 'clonedData' })
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value' })
  })
  test('key=fake, value={ the: value }, context data = fake: { the: valueold, another: value }, fake2: { the: value2 }', async () => {
    cloneDeep.mockReturnValue('clonedData')
    context.data[keyNames.CONTEXTS].fake = { the: 'valueold', another: 'value' }
    context.data[keyNames.CONTEXTS].fake2 = { the: 'value2' }
    await expect(context.setContextValue('fake', { the: 'value' })).resolves.toEqual(undefined)
    expect(context.state).toBe(null)
    expect(mockState.init).toHaveBeenCalledTimes(0)
    expect(context.data[keyNames.CONTEXTS]).toEqual({ fake: 'clonedData', fake2: { the: 'value2' } })
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value' })
  })
  test('key=fake, value={ the: value, access_token: { token: 123, expiry: +1000 } }, context data = {}', async () => {
    cloneDeep.mockReturnValue('clonedData')
    await expect(context.setContextValue('fake', { the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 } })).resolves.toEqual(undefined)
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
    expect(context.data[keyNames.CONTEXTS]).toEqual({ fake: 'clonedData' })
    expect(mockStateInstance.put).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake`, { access_token: { token: 123, expiry: DATE_NOW + 1000 } }, { ttl: 1 })
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 } })
  })
  test('key=fake, value={ the: value }, context data = fake { the: valueold, access_token: { token: 123, expiry: +1000 } }', async () => {
    cloneDeep.mockReturnValue('clonedData')
    context.data[keyNames.CONTEXTS].fake = { the: 'valueold', another: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 } }
    await expect(context.setContextValue('fake', { the: 'value' })).resolves.toEqual(undefined)
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
    expect(context.data[keyNames.CONTEXTS]).toEqual({ fake: 'clonedData' })
    expect(mockStateInstance.put).toHaveBeenCalledTimes(0)
    expect(mockStateInstance.delete).toBeCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake`)
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value' })
  })
  test('key=fake, value={ the: value, access_token: { token: 123, expiry: +1000 }, refresh_token: { token: 456, expiry: +2000 } }, context data = {}', async () => {
    cloneDeep.mockReturnValue('clonedData')
    await expect(context.setContextValue('fake', { the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 }, refresh_token: { token: 456, expiry: DATE_NOW + 2000 } })).resolves.toEqual(undefined)
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
    expect(context.data[keyNames.CONTEXTS]).toEqual({ fake: 'clonedData' })
    expect(mockStateInstance.put).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake`, { access_token: { token: 123, expiry: DATE_NOW + 1000 }, refresh_token: { token: 456, expiry: DATE_NOW + 2000 } }, { ttl: 2 })
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 }, refresh_token: { token: 456, expiry: DATE_NOW + 2000 } })
  })

  test('key=fake, value={ the: value, access_token: { token: 123, expiry: +1000 }, refresh_token: { token: 456, expiry: +2000 } }, context data = fake: { the: valueold, access_token: { token: 101, expiry: +3000 }}', async () => {
    cloneDeep.mockReturnValue('clonedData')
    context.data[keyNames.CONTEXTS].fake = { the: 'valueold', another: 'value', access_token: { token: 101, expiry: DATE_NOW + 3000 } }
    await expect(context.setContextValue('fake', { the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 }, refresh_token: { token: 456, expiry: DATE_NOW + 2000 } })).resolves.toEqual(undefined)
    expect(context.state).toBe(mockStateInstance)
    expect(mockState.init).toHaveBeenCalledTimes(1)
    expect(context.data[keyNames.CONTEXTS]).toEqual({ fake: 'clonedData' })
    expect(mockStateInstance.put).toHaveBeenCalledWith(`${keyNames.IMS}.fakens.pkg.action.${keyNames.CONTEXTS}.fake`, { access_token: { token: 123, expiry: DATE_NOW + 1000 }, refresh_token: { token: 456, expiry: DATE_NOW + 2000 } }, { ttl: 2 })
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 }, refresh_token: { token: 456, expiry: DATE_NOW + 2000 } })
  })

  test('key=fake, value={ the: value, access_token: { token: 123, expiry: +1000 } }, local = true, context data = {}', async () => {
    cloneDeep.mockReturnValue('clonedData')
    await expect(context.setContextValue('fake', { the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 } }, true)).resolves.toEqual(undefined)
    expect(context.state).toBe(null)
    expect(mockState.init).toHaveBeenCalledTimes(0)
    expect(context.data[keyNames.CONTEXTS]).toEqual({ fake: 'clonedData' })
    expect(cloneDeep).toHaveBeenCalledWith({ the: 'value', access_token: { token: 123, expiry: DATE_NOW + 1000 } })
  })
})
