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

const { context } = require('../src/context')
const config = require('@adobe/aio-lib-core-config')

afterEach(() => {
  jest.restoreAllMocks()
})

test('exports', async () => {
  expect(typeof context).toEqual('object')
})

test('set - fail', async () => {
  return expect(context.set()).rejects.toEqual(new Error('Missing IMS context label to set context data for'))
})

test('set - success', async () => {
  const contextName = 'myContext'
  const contextData = 'myContextData'
  expect.assertions(4)

  config.set.mockImplementation((key, value, local) => {
    expect(key).toEqual(`$ims.${contextName}`)
    expect(value).toEqual(contextData)
    expect(local).toEqual(false)
  })
  return expect(context.set(contextName, contextData)).resolves.toBeUndefined()
})

test('get - fail', () => {
  expect(context.get()).toEqual({ data: undefined, name: undefined })
})

test('get - success', async () => {
  const contextName = 'myContext'
  const contextData = 'myContextData'
  expect.assertions(2)

  config.get.mockImplementation((key) => {
    expect(key).toEqual(`$ims.${contextName}`)
    return contextData
  })

  return expect(context.get(contextName)).toEqual({ data: contextData, name: contextName })
})

test('keys - success', async () => {
  const contexts = {
    context1: {},
    context2: {},
    context3: {}
  }

  config.get.mockImplementation((key) => {
    if (key === '$ims') {
      return {
        ...contexts,
        $dollarPrefixedContextVariable: {}
      }
    }
  })

  return expect(await context.keys()).toEqual(Object.keys(contexts))
})

test('plugins - set', async () => {
  const contextName = '$plugins'
  const contextData = ['plugin1', 'plugin2']
  expect.assertions(3)

  config.set.mockImplementation((key, value, local) => {
    expect(key).toEqual(`$ims.${contextName}`)
    expect(value).toEqual(contextData)
    expect(local).toEqual(false)
  })

  context.plugins = contextData
})

test('plugins - get', () => {
  const contextName = '$plugins'
  const contextData = ['plugin1', 'plugin2']
  expect.assertions(2)

  config.get.mockImplementation(key => {
    expect(key).toEqual(`$ims.${contextName}`)
    return contextData
  })

  expect(context.plugins).toEqual(contextData)
})

test('setCurrent, .current', () => {
  const contextName = '$current'
  const contextData = 'myContext'
  expect.assertions(6)

  config.set.mockImplementation((key, value, local) => {
    expect(key).toEqual(`$ims.${contextName}`)
    expect(value).toEqual(contextData)
    expect(local).toEqual(true)
  })

  context.setCurrent(contextData)
  context.current = contextData
})
