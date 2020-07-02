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

const TheContext = require('../../src/ctx/ConfigCliContext')

const aioConfig = require('@adobe/aio-lib-core-config')
jest.mock('@adobe/aio-lib-core-config')

const keyNames = {
  IMS: 'a',
  CONFIG: 'b',
  CONTEXTS: 'c',
  CURRENT: 'd',
  PLUGINS: 'e',
  CLI: 'd'
}

let context
beforeEach(() => {
  jest.resetAllMocks()
  context = new TheContext(keyNames)
})

describe('constructor', () => {
  test('({ fake: config })', () => {
    const context = new TheContext({ fake: 'config' })
    expect(aioConfig.reload).toHaveBeenCalled()
    expect(context.aioConfig).toEqual(aioConfig)
    expect(context.keyNames).toEqual({ fake: 'config' })
  })
})

describe('getCli', () => {
  test('(<no args>)', async () => {
    aioConfig.get.mockReturnValue('value')
    await expect(context.getCli()).resolves.toEqual('value')
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`)
  })
})

describe('setCli', () => {
  test('{ the: value }, no previous value', async () => {
    aioConfig.get.mockReturnValue(undefined)
    await expect(context.setCli({ the: 'value' })).resolves.toEqual(undefined)
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`)
    expect(aioConfig.set).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`, { the: 'value' }, true)
  })

  test('{ the: value }, prev={ another: fakevalue }', async () => {
    aioConfig.get.mockReturnValue({ another: 'fakevalue' })
    await expect(context.setCli({ the: 'value' })).resolves.toEqual(undefined)
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`)
    expect(aioConfig.set).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`, { the: 'value', another: 'fakevalue' }, true)
  })

  test('{ the: value }, local=false, merge=false, prev={ another: fakevalue }', async () => {
    aioConfig.get.mockReturnValue({ another: 'fakevalue' })
    await expect(context.setCli({ the: 'value' }, false, false)).resolves.toEqual(undefined)
    expect(aioConfig.get).toHaveBeenCalledTimes(0)
    expect(aioConfig.set).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`, { the: 'value' }, false)
  })

  test('{ the: value }, local=false, merge=true, prev={ another: fakevalue }', async () => {
    aioConfig.get.mockReturnValue({ another: 'fakevalue' })
    await expect(context.setCli({ the: 'value' }, false, true)).resolves.toEqual(undefined)
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`)
    expect(aioConfig.set).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`, { the: 'value', another: 'fakevalue' }, false)
  })

  test('{ the: value }, local=false, merge=true, prev={ the: valueold }', async () => {
    aioConfig.get.mockReturnValue({ the: 'valueold' })
    await expect(context.setCli({ the: 'value' }, false, true)).resolves.toEqual(undefined)
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`)
    expect(aioConfig.set).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.${keyNames.CLI}`, { the: 'value' }, false)
  })
  test('value=notanobject', async () => {
    await expect(context.setCli('notanobject')).rejects.toThrow('contextData must be an object')
  })
})

describe('getContextValue', () => {
  test('(fake)', async () => {
    aioConfig.get.mockReturnValue('value')
    await expect(context.getContextValue('fake')).resolves.toEqual('value')
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.fake`)
  })
})

describe('getConfigValue', () => {
  test('(fake)', async () => {
    aioConfig.get.mockReturnValue('value')
    await expect(context.getConfigValue('fake')).resolves.toEqual('value')
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONFIG}.fake`)
  })
})

describe('setContextValue', () => {
  test('(fake, { the: value }, true)', async () => {
    await expect(context.setContextValue('fake', { the: 'value' }, true)).resolves.toEqual(undefined)
    expect(aioConfig.set).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}.fake`, { the: 'value' }, true)
  })
})

describe('setConfigValue', () => {
  test('(fake, { the: value }, true)', async () => {
    await expect(context.setConfigValue('fake', { the: 'value' }, true)).resolves.toEqual(undefined)
    expect(aioConfig.set).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONFIG}.fake`, { the: 'value' }, true)
  })
})

describe('contextKeys', () => {
  test('<no args>, no keys', async () => {
    await expect(context.contextKeys()).resolves.toEqual([])
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}`)
  })
  test('<no args>, keys = [the, dude, ethan, joel]', async () => {
    aioConfig.get.mockReturnValue({ the: 'a', dude: 'b', ethan: 'coen', joel: 'coen' })
    await expect(context.contextKeys()).resolves.toEqual(['the', 'dude', 'ethan', 'joel'])
    expect(aioConfig.get).toHaveBeenCalledWith(`${keyNames.IMS}.${keyNames.CONTEXTS}`)
  })
})
