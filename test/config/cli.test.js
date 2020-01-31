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
  expect(aioConfig.set).toHaveBeenCalledWith('imsKey.sheep', 'baa')
})

test('contexts()', async () => {
  const config = new CliConfig('imsKey')

  aioConfig.get.mockReturnValue({ $not: 'acontext', sheep: 'baah', cow: 'mooh' })

  await expect(config.contexts()).resolves.toEqual(['sheep', 'cow'])
  expect(aioConfig.get).toHaveBeenCalledWith('imsKey')
})
