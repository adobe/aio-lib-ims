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

const Config = require('../../src/config/config')

beforeEach(() => {
  jest.resetAllMocks()
})

test('constructor', async () => {
  const config = new Config('imsKey')
  expect(config.configKey).toBe('imsKey')
})

test('get(mooh)', async () => {
  const config = new Config('imsKey')
  await expect(config.get('mooh')).rejects.toThrow('abstract method is not implemented')
})

test('set(sheep, baa)', async () => {
  const config = new Config('imsKey')
  await expect(config.set('sheep', 'baa')).rejects.toThrow('abstract method is not implemented')
})

test('contexts()', async () => {
  const config = new Config('imsKey')
  await expect(config.keys()).rejects.toThrow('abstract method is not implemented')
})
