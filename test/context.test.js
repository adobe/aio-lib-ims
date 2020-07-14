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

jest.mock('../src/ctx/StateActionContext')
jest.mock('../src/ctx/ConfigCliContext')
const StateActionContext = require('../src/ctx/StateActionContext')
const ConfigCliContext = require('../src/ctx/ConfigCliContext')

beforeEach(() => {
  StateActionContext.mockClear()
  ConfigCliContext.mockClear()
  delete process.env.__OW_ACTION_NAME
})

test('exports', async () => {
  expect(typeof ctx.getContext).toEqual('function')
  expect(typeof ctx.resetContext).toEqual('function')
  expect(ctx.CURRENT).toEqual('current')
  expect(ctx.IMS).toEqual('ims')
  expect(ctx.CLI).toEqual('cli')
})

describe('getContext', () => {
  beforeEach(async () => {
    // clean any previous instance
    ctx.resetContext()
  })
  test('with cli config', async () => {
    const context = ctx.getContext()
    expect(ConfigCliContext).toHaveBeenCalledTimes(1)
    expect(StateActionContext).toHaveBeenCalledTimes(0)
    expect(context).toBe(ConfigCliContext.mock.instances[0])

    // always return same context after init
    expect(ctx.getContext()).toBe(context)
  })

  test('with action config', async () => {
    process.env.__OW_ACTION_NAME = 'fake'
    const context = await ctx.getContext()
    expect(ConfigCliContext).toHaveBeenCalledTimes(0)
    expect(StateActionContext).toHaveBeenCalledTimes(1)
    expect(context).toBe(StateActionContext.mock.instances[0])

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
    process.env.__OW_ACTION_NAME = 'fake'
    const context = await ctx.getContext()
    expect(ConfigCliContext).toHaveBeenCalledTimes(0)
    expect(StateActionContext).toHaveBeenCalledTimes(1)
    expect(context).toBe(StateActionContext.mock.instances[0])
  })
})
