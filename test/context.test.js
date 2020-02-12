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

const ctx = require('../src/context')

jest.mock('../src/config/action')
jest.mock('../src/config/cli')
const ActionConfig = require('../src/config/action')
const CliConfig = require('../src/config/cli')

beforeEach(() => {
  ActionConfig.mockClear()
  CliConfig.mockClear()
  delete process.env.__OW_ACTION_NAME
})

test('exports', async () => {
  expect(typeof ctx.getContext).toEqual('function')
  expect(typeof ctx.resetContext).toEqual('function')
  expect(ctx.PLUGINS).toEqual('$plugins')
  expect(ctx.CURRENT).toEqual('$current')
  expect(ctx.IMS).toEqual('$ims')
})

describe('getContext', () => {
  beforeEach(async () => {
    // clean any previous instance
    ctx.resetContext()
  })
  test('with cli config', async () => {
    const context = ctx.getContext()
    expect(CliConfig).toHaveBeenCalledTimes(1)
    expect(ActionConfig).toHaveBeenCalledTimes(0)
    expect(context._config).toBe(CliConfig.mock.instances[0])

    // always return same context after init
    expect(ctx.getContext()).toBe(context)
  })

  test('with action config', async () => {
    process.env.__OW_ACTION_NAME = 'yolo'
    const context = await ctx.getContext()
    expect(CliConfig).toHaveBeenCalledTimes(0)
    expect(ActionConfig).toHaveBeenCalledTimes(1)
    expect(context._config).toBe(ActionConfig.mock.instances[0])

    // always return same context after init
    expect(ctx.getContext()).toBe(context)
  })
})

describe('init context with action config', () => {
  beforeEach(async () => {
    // clean any previous instance
    ctx.resetContext()
  })
  test('ctx.getContext', async () => {
    process.env.__OW_ACTION_NAME = 'yolo'
    const context = await ctx.getContext()
    expect(CliConfig).toHaveBeenCalledTimes(0)
    expect(ActionConfig).toHaveBeenCalledTimes(1)
    expect(context._config).toBe(ActionConfig.mock.instances[0])
  })
})

describe('context operations (cli config)', () => {
  let context
  let _config
  beforeEach(async () => {
    // clean any previous instance
    ctx.resetContext()
    context = await ctx.getContext()
    _config = CliConfig.mock.instances[0]
  })

  test('set(null) and no current - fail', async () => {
    return expect(context.set(null)).rejects.toEqual(new Error('Missing IMS context label to set context data for'))
  })

  test('set(null, data) and current - success', async () => {
    _config.get.mockResolvedValue('myContext')
    const contextData = 'myContextData'
    expect.assertions(3)
    await expect(context.set(null, contextData)).resolves.toBeUndefined()
    expect(_config.set).toHaveBeenCalledWith('myContext', contextData, false)
    // also make sure current has not been set
    expect(_config.set).not.toHaveBeenCalledWith(ctx.CURRENT, expect.any(String))
  })

  test('set(contextName, data) and no current - success', async () => {
    const contextName = 'myContext'
    const contextData = 'myContextData'

    expect.assertions(3)
    await expect(context.set(contextName, contextData)).resolves.toBeUndefined()
    expect(_config.set).toHaveBeenCalledWith(contextName, contextData, false)
    // also make sure current has been set
    expect(_config.set).toHaveBeenCalledWith(ctx.CURRENT, 'myContext', true)
  })

  test('set(contextName, data, true) and no current - success', async () => {
    const contextName = 'myContext'
    const contextData = 'myContextData'

    expect.assertions(3)
    await expect(context.set(contextName, contextData, true)).resolves.toBeUndefined()
    expect(_config.set).toHaveBeenCalledWith(contextName, contextData, true)
    // also make sure current has been set
    expect(_config.set).toHaveBeenCalledWith(ctx.CURRENT, 'myContext', true)
  })

  test('set(contextName, data) and current - success', async () => {
    _config.get.mockResolvedValue('myContext2')
    const contextName = 'myContext'
    const contextData = 'myContextData'
    expect.assertions(3)
    await expect(context.set(contextName, contextData)).resolves.toBeUndefined()
    expect(_config.set).toHaveBeenCalledWith(contextName, contextData, false)
    // also make sure current has not been set
    expect(_config.set).not.toHaveBeenCalledWith(ctx.CURRENT, expect.any(String))
  })

  test('get() no current, no data', async () => {
    await expect(context.get()).resolves.toEqual({ data: undefined, name: undefined })
    expect(_config.get).toHaveBeenCalledTimes(1)
    expect(_config.get).toHaveBeenCalledWith(ctx.CURRENT)
  })

  test('get(contextName) with no current, no data', async () => {
    const contextName = 'myContext'
    await expect(context.get(contextName)).resolves.toEqual({ data: undefined, name: contextName })
    expect(_config.get).toHaveBeenCalledTimes(1)
    expect(_config.get).toHaveBeenCalledWith(contextName)
  })

  test('get(contextName) with no current, and data', async () => {
    const contextName = 'myContext'
    _config.get.mockImplementation(() => 'contextData')
    await expect(context.get(contextName)).resolves.toEqual({ data: 'contextData', name: contextName })
    expect(_config.get).toHaveBeenCalledTimes(1)
    expect(_config.get).toHaveBeenCalledWith(contextName)
  })

  test('get() with current, no data', async () => {
    _config.get.mockImplementation(k => k === ctx.CURRENT ? 'myContext' : undefined)
    await expect(context.get()).resolves.toEqual({ data: undefined, name: 'myContext' })
    expect(_config.get).toHaveBeenCalledTimes(2)
    expect(_config.get).toHaveBeenCalledWith(ctx.CURRENT)
    expect(_config.get).toHaveBeenCalledWith('myContext')
  })

  test('get() with current, and data', async () => {
    _config.get.mockImplementation(k => k === ctx.CURRENT ? 'myContext' : 'contextData')
    await expect(context.get()).resolves.toEqual({ data: 'contextData', name: 'myContext' })
    expect(_config.get).toHaveBeenCalledTimes(2)
    expect(_config.get).toHaveBeenCalledWith(ctx.CURRENT)
    expect(_config.get).toHaveBeenCalledWith('myContext')
  })

  test('keys()', async () => {
    _config.contexts.mockResolvedValue(['yo', 'lo'])
    await expect(context.keys()).resolves.toEqual(['yo', 'lo'])
    expect(_config.contexts).toHaveBeenCalledTimes(1)
  })

  test('getCurrent()', async () => {
    _config.get.mockResolvedValue('yolo')
    await expect(context.getCurrent()).resolves.toEqual('yolo')
    expect(_config.get).toHaveBeenCalledWith(ctx.CURRENT)
  })

  test('setCurrent()', async () => {
    await expect(context.setCurrent('yolo')).resolves.toBeUndefined()
    expect(_config.set).toHaveBeenCalledWith(ctx.CURRENT, 'yolo', true)
  })

  test('getPlugins()', async () => {
    _config.get.mockResolvedValue('yolo')
    await expect(context.getPlugins()).resolves.toEqual('yolo')
    expect(_config.get).toHaveBeenCalledWith(ctx.PLUGINS)
  })

  test('setPlugins()', async () => {
    await expect(context.setPlugins('yolo')).resolves.toBeUndefined()
    expect(_config.set).toHaveBeenCalledWith(ctx.PLUGINS, 'yolo', false)
  })
})

test('setCli, .cli', () => {
  const contextName = '$cli'
  const contextData = { foo: 'bar' }
  expect.assertions(8)

  config.set.mockImplementation((key, value, local) => {
    expect(key).toEqual(`$ims.${contextName}`)
    expect(value).toEqual(contextData)
    expect(local).toEqual(true)
  })

  config.get.mockImplementation(key => {
    expect(key).toEqual(`$ims.${contextName}`)
    return contextData
  })

  context.setCli(contextData)
  context.cli = contextData
  expect(context.cli).toEqual(contextData)
})
