const ActionConfig = require('../../src/config/action')

const mockState = {
  get: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}
jest.mock('@adobe/aio-lib-state', () => ({
  init: () => mockState
}))
const State = require('@adobe/aio-lib-state')

beforeEach(() => {
  mockState.get.mockReset()
  mockState.delete.mockReset()
  mockState.put.mockReset()
  process.env.__OW_ACTION_NAME = 'fake/pkg/action' // important keep path like structure with /
  process.env.__OW_NAMESPACE = 'fake'
  process.env.__OW_API_KEY = 'fake'
})

test('constructor', async () => {
  const config = new ActionConfig('imsKey')
  expect(config._data).toEqual({})
  expect(config._state).toEqual(null)
  expect(config._tokensLoaded).toEqual(false)
})

test('constructor missing __OW_ACTION_NAME ENV', () => {
  delete process.env.__OW_ACTION_NAME
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_ACTION_NAME\'')
})

test('constructor missing __OW_NAMESPACE ENV', () => {
  delete process.env.__OW_NAMESPACE
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_NAMESPACE\'')
})
test('constructor missing __OW_API_KEY ENV', () => {
  delete process.env.__OW_API_KEY
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_API_KEY\'')
})

test('constructor missing __OW_NAMESPACE,__OW_ACTION_NAME,__OW_API_KEY ENV', () => {
  delete process.env.__OW_NAMESPACE
  delete process.env.__OW_ACTION_NAME
  delete process.env.__OW_API_KEY
  expect(() => new ActionConfig('imsKey')).toThrow('missing environment variable(s) \'__OW_ACTION_NAME,__OW_NAMESPACE,__OW_API_KEY\'')
})

test('get($notacontext), no data', async () => {
  const config = new ActionConfig('imsKey')

  await expect(config.get('$notacontext')).resolves.toBeUndefined()
})

test('get($notacontext), some data', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { $notacontext: 'data' }
  await expect(config.get('$notacontext')).resolves.toEqual('data')
})

test('set($notacontext, data)', async () => {
  const config = new ActionConfig('imsKey')

  await expect(config.set('$notacontext', 'data')).resolves.toBeUndefined()
  expect(config._data.$notacontext).toEqual('data')
})

test('get(cow), no data, no tokens', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.get('cow')).resolves.toBeUndefined()
  // no context no token loaded, but state instance is defined
  expect(mockState.get).not.toHaveBeenCalled()
  expect(config._state).not.toEqual(null)
})

test('get(cow) twice, some data with 2 contexts, no tokens', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { cow: 'data', sheep: 'data2', $notcontext: 'data3' }

  await expect(config.get('cow')).resolves.toEqual('data')
  // should load tokens for each context once
  expect(config._state).not.toEqual(null)
  expect(mockState.get).toHaveBeenCalledTimes(2)
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow')
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.sheep')
  // when calling get again we shouldn't get tokens again
  await expect(config.get('cow')).resolves.toEqual('data')
  mockState.get.mockReset()
  expect(mockState.get).not.toHaveBeenCalled()
})

test('get(cow) twice, some data, some tokens', async () => {
  const config = new ActionConfig('imsKey')
  config._data = { cow: { data: 1 }, sheep: { data: 2 } }
  mockState.get.mockResolvedValue({ value: { access_token: 'abc' } })

  await expect(config.get('cow')).resolves.toEqual({ data: 1, access_token: 'abc' })
  // should load tokens for each context once
  expect(config._state).not.toEqual(null)
  expect(mockState.get).toHaveBeenCalledTimes(2)
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.cow')
  expect(mockState.get).toHaveBeenCalledWith('imsKey.fake.pkg.action.sheep')
  // when calling get again we shouldn't get tokens again
  await expect(config.get('cow')).resolves.toEqual({ data: 1, access_token: 'abc' })
  await expect(config.get('sheep')).resolves.toEqual({ data: 2, access_token: 'abc' })
  mockState.get.mockReset()
  expect(mockState.get).not.toHaveBeenCalled()
})

test('set(cow, { data: 1 }) with no previous data', async () => {
  const config = new ActionConfig('imsKey')
  await expect(config.set('cow', { data: 1 })).resolves.toBeUndefined()
  // no context no token stored
  expect(mockState.put).not.toHaveBeenCalled()
  expect(config._state).toEqual(null)
  expect(config._data).toEqual({ cow: { data: 1 } })
})
