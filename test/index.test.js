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

const index = require('../src/index')
const tokenHelper = require('../src/token-helper')

afterEach(() => {
  jest.restoreAllMocks()
})

test('exports', async () => {
  expect(typeof index).toEqual('object')
})

test('getToken', async () => {
  jest.mock('../src/token-helper')
  expect.assertions(3)

  /** @private */
  function _curry (contextName, retVal) {
    return function (n) {
      expect(n).toEqual(contextName)
      return new Promise(resolve => resolve(retVal))
    }
  }

  expect(typeof index.getToken).toEqual('function')

  tokenHelper.IMS_TOKEN_MANAGER.getToken = jest.fn(_curry('myContext1', 'retVal1'))
  expect(await index.getToken('myContext1')).toEqual('retVal1')
})

test('getTokenWithOptions', async () => {
  jest.mock('../src/token-helper')
  expect.assertions(3)

  /** @private */
  function _curry (contextName, retVal) {
    return function (n, o) {
      expect(n).toEqual(contextName)
      return new Promise(resolve => resolve(`${retVal}-${JSON.stringify(o)}`))
    }
  }

  expect(typeof index.getToken).toEqual('function')

  tokenHelper.IMS_TOKEN_MANAGER.getToken = jest.fn(_curry('myContext1', 'retVal1'))
  expect(await index.getToken('myContext1', { test: true })).toEqual('retVal1-{"test":true}')
})

test('invalidateToken', async () => {
  jest.mock('../src/token-helper')
  expect.assertions(7)

  /** @private */
  function _curry (contextName, options) {
    return function (n, f) {
      expect(n).toEqual(contextName)
      expect(f).toEqual(options)
    }
  }

  expect(typeof index.invalidateToken).toEqual('function')

  tokenHelper.IMS_TOKEN_MANAGER.invalidateToken = jest.fn(_curry('myContext1', true))
  expect(await index.invalidateToken('myContext1', true)).toBeUndefined()
  tokenHelper.IMS_TOKEN_MANAGER.invalidateToken = jest.fn(_curry('myContext2', false))
  expect(await index.invalidateToken('myContext2')).toBeUndefined()
})
