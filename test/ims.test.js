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

const FormData = require('form-data')
const libEnv = require('@adobe/aio-lib-env')
const { STAGE_ENV, PROD_ENV } = jest.requireActual('@adobe/aio-lib-env')

const mockExponentialBackoff = jest.fn()
const mockHttpExponentialBackoff = jest.fn()
jest.mock('@adobe/aio-lib-env')
jest.mock('@adobe/aio-lib-core-networking', () => ({
  HttpExponentialBackoff: mockHttpExponentialBackoff
}))

const {
  getTokenData,
  Ims,
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  AUTHORIZATION_CODE,
  CLIENT_ID,
  CLIENT_SECRET,
  SCOPE
} = require('../src/ims')

beforeEach(() => {
  mockHttpExponentialBackoff.mockReturnValue({
    exponentialBackoff: mockExponentialBackoff
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  libEnv.getCliEnv.mockReturnValue(PROD_ENV) // default
  mockExponentialBackoff.mockClear()
})

/** @private */
function createTokenFromPayload (payload) {
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  return `header.${payloadBase64}.signature`
}

test('exports', async () => {
  expect(typeof Ims).toEqual('function')
  expect(typeof getTokenData).toEqual('function')
  expect(typeof ACCESS_TOKEN).toEqual('string')
  expect(typeof REFRESH_TOKEN).toEqual('string')
  expect(typeof AUTHORIZATION_CODE).toEqual('string')
  expect(typeof CLIENT_ID).toEqual('string')
  expect(typeof CLIENT_SECRET).toEqual('string')
  expect(typeof SCOPE).toEqual('string')
})

test('constructor', () => {
  const endpoints = {
    PROD_ENV: 'https://ims-na1.adobelogin.com',
    STAGE_ENV: 'https://ims-na1-stg1.adobelogin.com'
  }
  let ims

  // default, should use PROD endpoint (default for global cli env is PROD)
  ims = new Ims()
  expect(ims.endpoint).toEqual(endpoints.PROD_ENV)

  // if constructor parameter is set to STAGE, should use STAGE endpoint (overrides global env)
  ims = new Ims(STAGE_ENV)
  expect(ims.endpoint).toEqual(endpoints.STAGE_ENV)

  // if constructor parameter is set to an unknown string, should use PROD endpoint (default env)
  ims = new Ims('gibberish')
  expect(ims.endpoint).toEqual(endpoints.PROD_ENV)

  // if constructor parameter is set to null, should use PROD endpoint (default env)
  ims = new Ims(null)
  expect(ims.endpoint).toEqual(endpoints.PROD_ENV)

  // if global cli env is set to STAGE, should use it
  libEnv.getCliEnv.mockReturnValue(STAGE_ENV)
  ims = new Ims()
  expect(ims.endpoint).toEqual(endpoints.STAGE_ENV)

  // if global cli env is set to PROD, should use it
  libEnv.getCliEnv.mockReturnValue(PROD_ENV)
  ims = new Ims()
  expect(ims.endpoint).toEqual(endpoints.PROD_ENV)

  // default, should use PROD endpoint (global cli env is not set)
  libEnv.getCliEnv.mockReturnValue(null)
  ims = new Ims()
  expect(ims.endpoint).toEqual(endpoints.PROD_ENV)
})

test('getTokenData', () => {
  const payload = {
    access_token: 'foo',
    refresh_token: 'bar'
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  const token = `header.${payloadBase64}.signature`

  expect(getTokenData(token)).toEqual(payload)
})

test('Ims.fromToken - bad payload', async () => {
  const badPayload = {
    access_token: 'foo',
    refresh_token: 'bar'
  }
  const badPayloadBase64 = Buffer.from(JSON.stringify(badPayload)).toString('base64')
  const token = `header.${badPayloadBase64}.signature`

  return expect(Ims.fromToken(token)).rejects.toThrow('[IMSSDK:CANNOT_RESOLVE_ENVIRONMENT] Cannot resolve to IMS environment from token')
})

test('Ims.fromToken - ok payload', async () => {
  const payload = {
    as: 'ims-na1'
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  const token = `header.${payloadBase64}.signature`

  return expect(Ims.fromToken(token)).resolves.toEqual({ token, ims: new Ims('prod') })
})

test('Ims.toTokenResult', async () => {
  const payload = {
    as: 'ims-na1',
    created_at: 100,
    expires_in: 300,
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token'
  }

  const token = createTokenFromPayload(payload)
  const ims = new Ims()

  return expect(ims.toTokenResult(token)).resolves.toEqual({
    access_token: {
      expiry: 400,
      token
    },
    payload: {
      access_token: token
    }
  })
})

test('Ims.invalidateToken', async () => {
  const payload = {
    as: 'ims-na1',
    created_at: 100,
    expires_in: 300,
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token',
    type: 'access token'
  }

  const token = createTokenFromPayload(payload)
  const ims = new Ims()

  // have some return value from request module

  const serverResponsePayload = 'some return value'
  const serverResponse = {
    status: 200,
    text: () => serverResponsePayload
  }

  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))

  // no client_id and no_client_secret, shouldn't fail
  await expect(ims.invalidateToken(token)).resolves.toBeTruthy()

  const clientId = 'some-client-id'
  const clientSecret = 'some-client-secret'

  return expect(ims.invalidateToken(token, clientId, clientSecret)).resolves.toEqual(serverResponsePayload)
})

test('Ims.validateToken(token, clientId)', async () => {
  const ims = new Ims()

  const serverResponsePayload = {
    valid: false,
    token: {
      as: 'ims-na1',
      created_at: 100,
      expires_in: 300,
      access_token: 'my-access-token',
      refresh_token: 'my-refresh-token',
      type: 'access token',
      client_id: 'some-client-id-1'
    }
  }

  const serverResponse = {
    status: 200,
    text: () => serverResponsePayload
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))

  const clientId = 'some-client-id-2'
  const token = createTokenFromPayload(serverResponsePayload.token)

  await expect(ims.validateToken(token, clientId))
    .resolves.toEqual(serverResponsePayload)

  expect(mockExponentialBackoff).toHaveBeenCalledTimes(1)
})

test('Ims.validateToken(token), extracts client id from token', async () => {
  const ims = new Ims()

  const serverResponsePayload = {
    valid: false,
    token: {
      as: 'ims-na1',
      created_at: 100,
      expires_in: 300,
      access_token: 'my-access-token',
      refresh_token: 'my-refresh-token',
      type: 'access token',
      client_id: 'some-client-id'
    }
  }

  const serverResponse = {
    status: 200,
    text: () => serverResponsePayload
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))

  const token = createTokenFromPayload(serverResponsePayload.token)

  await expect(ims.validateToken(token))
    .resolves.toEqual(serverResponsePayload)

  expect(mockExponentialBackoff).toHaveBeenCalledTimes(1)
})

test('Ims.validateToken response is non parseable', async () => {
  const ims = new Ims()

  const payload = {
    as: 'ims-na1',
    created_at: 100,
    expires_in: 300,
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token',
    type: 'access token'
  }

  const serverResponsePayload = 'hello hello'
  const serverResponse = {
    status: 200,
    text: () => serverResponsePayload
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))

  const clientId = 'some-client-id'
  const token = createTokenFromPayload(payload)

  await expect(ims.validateToken(token, clientId))
    .resolves.toEqual(serverResponsePayload)

  expect(mockExponentialBackoff).toHaveBeenCalledTimes(1)
})

test('Ims.validateToken bad token', async () => {
  const ims = new Ims()

  const clientId = 'some-client-id'

  await expect(ims.validateToken('BADTOKEN', clientId))
    .resolves.toEqual({
      valid: false,
      reason: 'bad payload'
    })
})

test('Ims.getOrganizations(token)', async () => {
  const ims = new Ims()

  const responsePayload = 'response'

  const serverResponse = {
    status: 200,
    text: () => responsePayload
  }

  const payload = {
    as: 'ims-na1',
    created_at: 100,
    expires_in: 300,
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token',
    type: 'access token'
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))

  const token = createTokenFromPayload(payload)

  await expect(ims.getOrganizations(token))
    .resolves.toEqual(responsePayload)
})

test('Ims.getOrganizations(token) returns not JSON', async () => {
  const ims = new Ims()

  const responsePayload = 'noteverythingisJSON'

  const serverResponse = {
    status: 200,
    text: () => 'noteverythingisJSON'
  }

  const payload = {
    as: 'ims-na1',
    created_at: 100,
    expires_in: 300,
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token',
    type: 'access token'
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))

  const token = createTokenFromPayload(payload)

  await expect(ims.getOrganizations(token))
    .resolves.toEqual(responsePayload)
})

test('Ims.exchangeJwtToken', async () => {
  const ims = new Ims()
  const serverResponsePayload = {
    access_token: '',
    refresh_token: ''
  }

  const response = {
    status: 200,
    text: () => JSON.stringify(serverResponsePayload)
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(response))

  const clientId = 'some-client-id'
  const clientSecret = 'some-client-secret'
  const signedJwtToken = 'signed-jwt-token'

  return expect(ims.exchangeJwtToken(clientId, clientSecret, signedJwtToken))
    .resolves.toEqual({ payload: serverResponsePayload })
})

test('Ims.getAccessToken', async () => {
  const payload = {
    as: 'ims-na1',
    created_at: 100,
    expires_in: 300,
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token'
  }

  let authCode
  const ims = new Ims()

  const clientId = 'some-client-id'
  const clientSecret = 'some-client-secret'
  const scopes = 'some, scopes'

  // unknown type
  payload.type = 'unknown_type'
  authCode = createTokenFromPayload(payload)

  await expect(ims.getAccessToken(authCode, clientId, clientSecret, scopes))
    .rejects.toThrow('[IMSSDK:UNKNOWN_AUTHCODE_TYPE] Unknown type of authCode: unknown_type')

  const serverResponsePayload = {
    access_token: '',
    refresh_token: ''
  }

  const res = {
    status: 200,
    text: () => Promise.resolve(serverResponsePayload)
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementation(() => Promise.resolve(res))

  // authorization_code type
  payload.type = 'authorization_code'
  authCode = createTokenFromPayload(payload)

  await expect(ims.getAccessToken(authCode, clientId, clientSecret, scopes))
    .resolves.toEqual({ payload: serverResponsePayload })

  // refresh_token type
  payload.type = 'refresh_token'
  authCode = createTokenFromPayload(payload)

  return await expect(ims.getAccessToken(authCode, clientId, clientSecret, scopes))
    .resolves.toEqual({ payload: serverResponsePayload })
})

test('Ims.post', async () => {
  const ims = new Ims()
  const payload = 'data'

  const res = {
    status: 200,
    text: () => Promise.resolve(payload)
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(res))

  return expect(ims.post('api', 'token', 'parameters')).resolves.toEqual(payload)
})

test('Ims.post using FormData body', async () => {
  const ims = new Ims()
  const serverResponse = {
    status: 200,
    text: () => Promise.resolve(true)
  }
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))
  const formData = new FormData()
  const result = ims.post('api', 'token', formData)
  await expect(result).resolves.toEqual(true)
})

test('Ims.post throw error on unsuccessfully request', async () => {
  const ims = new Ims()
  const serverResponse = {
    status: 400,
    statusText: 'Bad Request'
  }
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(serverResponse))
  const result = ims.post('api', 'token', 'parameters')
  await expect(result).rejects.toThrow('400')
})

test('Ims.get', async () => {
  const ims = new Ims()
  const payload = 'data'

  const res = {
    status: 200,
    text: () => Promise.resolve(payload)
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementationOnce(() => Promise.resolve(res))

  // with data
  await expect(ims.get('api', 'token', 'parameters')).resolves.toEqual(payload)
})

test('Ims.getSusiUrl', () => {
  const ims = new Ims('prod')

  const clientId = 'some-client-id'
  const scopes = 'some, scopes'
  const callbackUrl = 'https://some-server.com/login-callback'
  const state = 'some-state'

  expect(ims.getSusiUrl(clientId, scopes, callbackUrl, state))
    .toEqual(
      'https://ims-na1.adobelogin.com/ims/authorize/v1?response_type=code&client_id=some-client-id&scope=some%2C+scopes&redirect_uri=https%3A%2F%2Fsome-server.com%2Flogin-callback&state=some-state'
    )
})

test('Ims.getSusiUrl - scopes null', () => {
  const ims = new Ims('prod')

  const clientId = 'some-client-id'
  const scopes = null
  const callbackUrl = 'https://some-server.com/login-callback'
  const state = 'some-state'

  expect(ims.getSusiUrl(clientId, scopes, callbackUrl, state))
    .toEqual(
      'https://ims-na1.adobelogin.com/ims/authorize/v1?response_type=code&client_id=some-client-id&redirect_uri=https%3A%2F%2Fsome-server.com%2Flogin-callback&state=some-state'
    )
})

test('Ims.getSusiUrl - callbackUrl null', () => {
  const ims = new Ims('prod')

  const clientId = 'some-client-id'
  const scopes = 'some, scopes'
  const callbackUrl = null
  const state = 'some-state'

  expect(ims.getSusiUrl(clientId, scopes, callbackUrl, state))
    .toEqual(
      'https://ims-na1.adobelogin.com/ims/authorize/v1?response_type=code&client_id=some-client-id&scope=some%2C+scopes&state=some-state'
    )
})

test('Ims.getAccessTokenByClientCredentials', async () => {
  const ims = new Ims()

  const clientId = 'some-client-id'
  const clientSecret = 'some-client-secret'
  const orgId = 'some-org-id'
  const scopes = ['some', 'things']

  const serverResponsePayload = {
    access_token: '',
    refresh_token: ''
  }

  const res = {
    status: 200,
    text: () => Promise.resolve(serverResponsePayload)
  }

  // have some return value from request module
  mockExponentialBackoff.mockImplementation(() => Promise.resolve(res))

  await expect(ims.getAccessTokenByClientCredentials(clientId, clientSecret, orgId, scopes))
    .resolves.toEqual({ payload: serverResponsePayload })
})
