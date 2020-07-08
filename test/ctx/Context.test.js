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

const Context = require('../../src/ctx/Context')

const keyNames = {
  IMS: 'a',
  CONFIG: 'b',
  CONTEXTS: 'c',
  CURRENT: 'd',
  PLUGINS: 'e'
}

let context
beforeEach(() => {
  context = new Context(keyNames)
})

describe('constructor', () => {
  test('({ fake: config })', () => {
    const context = new Context({ fake: 'config' })
    expect(context.keyNames).toEqual({ fake: 'config' })
  })
})

describe('not implemented methods', () => {
  test('Context.getContextValue', async () => {
    await expect(context.getContextValue('key')).rejects.toThrow('abstract method is not implemented')
  })
  test('Context.setContextValue', async () => {
    await expect(context.setContextValue('key', 'value')).rejects.toThrow('abstract method is not implemented')
  })
  test('Context.getConfigValue', async () => {
    await expect(context.getConfigValue('key')).rejects.toThrow('abstract method is not implemented')
  })
  test('Context.setConfigValue', async () => {
    await expect(context.setConfigValue('key', 'value')).rejects.toThrow('abstract method is not implemented')
  })
  test('Context.contextKeys', async () => {
    await expect(context.contextKeys('key', 'value')).rejects.toThrow('abstract method is not implemented')
  })
})

describe('getPlugins', () => {
  test('(<no args>)', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue('returnValue')
    const ret = await context.getPlugins()
    expect(ret).toEqual('returnValue')
    expect(context.getConfigValue).toHaveBeenCalledWith(keyNames.PLUGINS)
  })
})

describe('setPlugins', () => {
  test('([a,b,c])', async () => {
    context.setConfigValue = jest.fn().mockResolvedValue('returnValue')
    const ret = await context.setPlugins(['a', 'b', 'c'])
    expect(ret).toEqual(undefined)
    expect(context.setConfigValue).toHaveBeenCalledWith(keyNames.PLUGINS, ['a', 'b', 'c'], false)
  })
})

describe('getCurrent', () => {
  test('(<no args>)', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue('returnValue')
    const ret = await context.getCurrent()
    expect(ret).toEqual('returnValue')
    expect(context.getConfigValue).toHaveBeenCalledWith(keyNames.CURRENT)
  })
})

describe('setCurrent', () => {
  test('(fake)', async () => {
    context.setConfigValue = jest.fn().mockResolvedValue('returnValue')
    const ret = await context.setCurrent('fake')
    expect(ret).toEqual(undefined)
    expect(context.setConfigValue).toHaveBeenCalledWith(keyNames.CURRENT, 'fake', true)
  })
})

describe('get', () => {
  test('(<no args>), current=fake', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue('fake')
    context.getContextValue = jest.fn().mockResolvedValue({ fake: 'data' })
    const ret = await context.get()
    expect(ret).toEqual({ data: { fake: 'data' }, name: 'fake' })
    expect(context.getContextValue).toHaveBeenCalledWith('fake')
    expect(context.getConfigValue).toHaveBeenCalledWith(keyNames.CURRENT)
  })
  test('(<no args>), current=undefined', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue(undefined)
    context.getContextValue = jest.fn().mockResolvedValue({ fake: 'data' })
    const ret = await context.get()
    expect(ret).toEqual({ data: undefined, name: undefined })
    expect(context.getContextValue).toHaveBeenCalledTimes(0)
    expect(context.getConfigValue).toHaveBeenCalledWith(keyNames.CURRENT)
  })
  test('(fake)', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue(undefined)
    context.getContextValue = jest.fn().mockResolvedValue({ fake: 'data' })
    const ret = await context.get('fake')
    expect(ret).toEqual({ data: { fake: 'data' }, name: 'fake' })
    expect(context.getContextValue).toHaveBeenCalledWith('fake')
    expect(context.getConfigValue).toHaveBeenCalledTimes(0)
  })
})

describe('set', () => {
  test('(undefined, { data: fake }), current=fake', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue('fake')
    context.setConfigValue = jest.fn()
    context.setContextValue = jest.fn()
    const ret = await context.set(undefined, { data: 'fake' })
    expect(ret).toEqual(undefined)
    expect(context.setContextValue).toHaveBeenCalledWith('fake', { data: 'fake' }, false)
    expect(context.getConfigValue).toHaveBeenCalledWith(keyNames.CURRENT)
    expect(context.setConfigValue).toHaveBeenCalledTimes(0)
  })

  test('(undefined, { data: fake }), current=undefined', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue(undefined)
    context.setContextValue = jest.fn()
    await expect(context.set(undefined, { data: 'fake' })).rejects.toThrow('Missing IMS context label to set context data for')
  })

  test('(fake, { data: fake }), current=undefined', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue(undefined)
    context.setConfigValue = jest.fn()
    context.setContextValue = jest.fn()
    const ret = await context.set('fake', { data: 'fake' })
    expect(ret).toEqual(undefined)
    expect(context.setContextValue).toHaveBeenCalledWith('fake', { data: 'fake' }, false)
    expect(context.setConfigValue).toHaveBeenCalledTimes(0)
  })

  test('(fake, { data: fake }), current=other', async () => {
    context.getConfigValue = jest.fn().mockResolvedValue('other')
    context.setConfigValue = jest.fn()
    context.setContextValue = jest.fn()
    const ret = await context.set('fake', { data: 'fake' })
    expect(ret).toEqual(undefined)
    expect(context.setContextValue).toHaveBeenCalledWith('fake', { data: 'fake' }, false)
    expect(context.setConfigValue).toHaveBeenCalledTimes(0)
  })
})

describe('keys', () => {
  test('(<no args>)', async () => {
    context.contextKeys = jest.fn().mockResolvedValue(['fake', 'other'])
    const ret = await context.keys()
    expect(ret).toEqual(['fake', 'other'])
    expect(context.contextKeys).toHaveBeenCalledWith()
  })
})
