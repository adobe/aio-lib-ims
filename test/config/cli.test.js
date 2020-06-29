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

const CliConfig = require('../../src/config/cli')

const aioConfig = require('@adobe/aio-lib-core-config')
jest.mock('@adobe/aio-lib-core-config')

beforeEach(() => {
  jest.resetAllMocks()
})

test('constructor', async () => {
  const config = new CliConfig('imsKey')
  expect(aioConfig.reload).toHaveBeenCalledTimes(1)
  expect(config._cliConfig).toEqual(aioConfig)
})

test('get(mooh)', async () => {
  const config = new CliConfig('imsKey')

  aioConfig.get.mockReturnValue('says the cow')

  await expect(config.get('mooh')).resolves.toEqual('says the cow')
  expect(aioConfig.get).toHaveBeenCalledWith('imsKey.mooh')
})

test('set(sheep, baa)', async () => {
  const config = new CliConfig('imsKey')

  await expect(config.set('sheep', 'baa')).resolves.toBeUndefined()
  expect(aioConfig.set).toHaveBeenCalledWith('imsKey.sheep', 'baa', false)
})

test('set(sheep, baa, true)', async () => {
  const config = new CliConfig('imsKey')

  await expect(config.set('sheep', 'baa', true)).resolves.toBeUndefined()
  expect(aioConfig.set).toHaveBeenCalledWith('imsKey.sheep', 'baa', true)
})

test('set(sheep, baa, false)', async () => {
  const config = new CliConfig('imsKey')

  await expect(config.set('sheep', 'baa', false)).resolves.toBeUndefined()
  expect(aioConfig.set).toHaveBeenCalledWith('imsKey.sheep', 'baa', false)
})

test('keys()', async () => {
  const config = new CliConfig('imsKey')

  aioConfig.get.mockReturnValue({ sheep: 'baah', cow: 'mooh' })

  await expect(config.keys()).resolves.toEqual(['sheep', 'cow'])
  expect(aioConfig.get).toHaveBeenCalledWith('imsKey')
})

test('keys() (empty)', async () => {
  const config = new CliConfig('imsKey')

  aioConfig.get.mockReturnValue()

  await expect(config.keys()).resolves.toEqual([])
  expect(aioConfig.get).toHaveBeenCalledWith('imsKey')
})
