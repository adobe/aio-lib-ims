
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
const LRU = require('lru-cache')
jest.mock('lru-cache')

const ValidationCache = require('../src/ValidationCache')

beforeEach(() => {
  LRU.mockClear()
})

const FAKEPARAMSHASH = '���QL�p�/uh}�� DBR�w��`WD2�jP' // sha256 hash of 'afds-b-cf' in binary format

test('constructor (1, 2, 3)', () => {
  const validationCache = new ValidationCache(1, 2, 3)
  expect(LRU).toHaveBeenCalledTimes(2)
  expect(LRU.mock.calls[0][0]).toEqual({ max: 2, maxAge: 1 })
  expect(LRU.mock.calls[1][0]).toEqual({ max: 3, maxAge: 1 })
  expect(validationCache.validCache).toBe(LRU.mock.instances[0])
  expect(validationCache.invalidCache).toBe(LRU.mock.instances[1])
})

test('validateWithCache(() => { status: 200, message: fake }, a, b, c) no cache', async () => {
  const validationCache = new ValidationCache(0, 2, 3)
  const validationFunction = jest.fn().mockResolvedValue({ status: 200, message: 'fake' })
  const res = await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cf')
  expect(res).toEqual({ status: 200, message: 'fake' })
  expect(validationFunction).toHaveBeenCalledWith('afds', 'b', 'cf')
  expect(validationCache.validCache.get).toHaveBeenCalledWith(FAKEPARAMSHASH)
  expect(validationCache.invalidCache.get).toHaveBeenCalledWith(FAKEPARAMSHASH)
  expect(validationCache.validCache.set).toHaveBeenCalledWith(FAKEPARAMSHASH, '\u0001')
  expect(validationCache.invalidCache.set).not.toHaveBeenCalled()
})

test('validateWithCache(() => { status: 200, message: fake }, a, b, c) with cache', async () => {
  const validationCache = new ValidationCache(0, 2, 3)
  const validationFunction = jest.fn().mockResolvedValue({ status: 200, message: 'fake' })

  // first call to warmup encoding tables
  await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cf')
  validationFunction.mockClear()
  // mock cache
  validationCache.validCache.get.mockReturnValue(validationCache.validCache.set.mock.calls[0][1])
  // clear calls
  validationCache.validCache.get.mockClear()
  validationCache.validCache.set.mockClear()
  validationCache.invalidCache.get.mockClear()
  validationCache.invalidCache.set.mockClear()

  const res = await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cf')
  expect(res).toEqual({ status: 200, message: 'fake' })
  expect(validationFunction).not.toHaveBeenCalled()
  expect(validationCache.validCache.get).toHaveBeenCalledWith(FAKEPARAMSHASH)
  expect(validationCache.invalidCache.get).toHaveBeenCalledWith(FAKEPARAMSHASH) // checks invalid cache first that's why it's called
  expect(validationCache.validCache.set).not.toHaveBeenCalled()
  expect(validationCache.invalidCache.set).not.toHaveBeenCalled()
})

test('validateWithCache(() => { status: 400, message: fake }, a, b, c) no cache', async () => {
  const validationCache = new ValidationCache(0, 2, 3)
  const validationFunction = jest.fn().mockResolvedValue({ status: 400, message: 'fake' })
  const res = await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cf')
  expect(res).toEqual({ status: 400, message: 'fake' })
  expect(validationFunction).toHaveBeenCalledWith('afds', 'b', 'cf')
  expect(validationCache.invalidCache.get).toHaveBeenCalledWith(FAKEPARAMSHASH)
  expect(validationCache.validCache.get).toHaveBeenCalledWith(FAKEPARAMSHASH)
  expect(validationCache.invalidCache.set).toHaveBeenCalledWith(FAKEPARAMSHASH, '\u0001')
  expect(validationCache.validCache.set).not.toHaveBeenCalled()
})

test('validateWithCache(() => { status: 400, message: fake }, a, b, c) with cache', async () => {
  const validationCache = new ValidationCache(0, 2, 3)
  const validationFunction = jest.fn().mockResolvedValue({ status: 400, message: 'fake' })

  // first call to warmup encoding tables
  await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cf')
  validationFunction.mockClear()
  // mock cache
  validationCache.invalidCache.get.mockReturnValue(validationCache.invalidCache.set.mock.calls[0][1])
  // clear calls
  validationCache.validCache.get.mockClear()
  validationCache.validCache.set.mockClear()
  validationCache.invalidCache.get.mockClear()
  validationCache.invalidCache.set.mockClear()

  const res = await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cf')
  expect(res).toEqual({ status: 400, message: 'fake' })
  expect(validationFunction).not.toHaveBeenCalled()
  expect(validationCache.invalidCache.get).toHaveBeenCalledWith(FAKEPARAMSHASH)
  expect(validationCache.validCache.get).not.toHaveBeenCalled() // checks invalid cache first
  expect(validationCache.invalidCache.set).not.toHaveBeenCalled()
  expect(validationCache.validCache.set).not.toHaveBeenCalled()
})

test('validateWithCache encoding of response is stored but cache has been evicted', async () => {
  const validationCache = new ValidationCache(0, 2, 3)
  const validationFunction = jest.fn()

  // first calls to warmup encoding tables
  validationFunction.mockResolvedValue({ status: 400, message: 'fake' })
  await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cf')
  validationFunction.mockResolvedValue({ status: 200, message: 'fake1' })
  await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cfde')
  validationFunction.mockResolvedValue({ status: 399, message: 'fake2' })
  await validationCache.validateWithCache(validationFunction, 'afds', 'b', 'cfd')
  validationFunction.mockClear()

  // mock no cache
  validationCache.invalidCache.get.mockReturnValue(undefined)
  validationCache.validCache.get.mockReturnValue(undefined)
  // clear calls
  validationCache.validCache.get.mockClear()
  validationCache.validCache.set.mockClear()
  validationCache.invalidCache.get.mockClear()
  validationCache.invalidCache.set.mockClear()

  validationFunction.mockResolvedValue({ status: 400, message: 'fake' })
  const res = await validationCache.validateWithCache(validationFunction, 'afdfdasfdsas', 'fdsavvb', 'cfgfdsagdsa')
  expect(res).toEqual({ status: 400, message: 'fake' })
  expect(validationFunction).toHaveBeenCalled()
  expect(validationCache.invalidCache.get).toHaveBeenCalled()
  expect(validationCache.validCache.get).toHaveBeenCalled()
  expect(validationCache.invalidCache.set).toHaveBeenCalledWith(expect.any(String), '\u0001') // encoding table stored the response
  expect(validationCache.validCache.set).not.toHaveBeenCalled()

  // clear calls
  validationCache.validCache.get.mockClear()
  validationCache.validCache.set.mockClear()
  validationCache.invalidCache.get.mockClear()
  validationCache.invalidCache.set.mockClear()

  validationFunction.mockResolvedValue({ status: 200, message: 'fake1' })
  const res2 = await validationCache.validateWithCache(validationFunction, 'afdfdasfdsas', 'fdsavvb', 'cfgfdsagdsa')
  expect(res2).toEqual({ status: 200, message: 'fake1' })
  expect(validationFunction).toHaveBeenCalled()
  expect(validationCache.invalidCache.get).toHaveBeenCalled()
  expect(validationCache.validCache.get).toHaveBeenCalled()
  expect(validationCache.validCache.set).toHaveBeenCalledWith(expect.any(String), '\u0002') // encoding table stored the response
  expect(validationCache.invalidCache.set).not.toHaveBeenCalled()

  // clear calls
  validationCache.validCache.get.mockClear()
  validationCache.validCache.set.mockClear()
  validationCache.invalidCache.get.mockClear()
  validationCache.invalidCache.set.mockClear()

  validationFunction.mockResolvedValue({ status: 206, message: 'new' })
  const res3 = await validationCache.validateWithCache(validationFunction, 'afdfdasfdsas', 'fdsavvb', 'cfgfdsagdsa')
  expect(res3).toEqual({ status: 206, message: 'new' })
  expect(validationFunction).toHaveBeenCalled()
  expect(validationCache.invalidCache.get).toHaveBeenCalled()
  expect(validationCache.validCache.get).toHaveBeenCalled()
  expect(validationCache.validCache.set).toHaveBeenCalledWith(expect.any(String), '\u0004') // new entry in encoding table
  expect(validationCache.invalidCache.set).not.toHaveBeenCalled()
})
