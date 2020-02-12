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

const rp = require('request-promise-native')
jest.mock('request-promise-native')

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

afterEach(() => {
  jest.restoreAllMocks()
  rp.mockRestore()
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

  return expect(Ims.fromToken(token)).rejects.toEqual(new Error('Cannot resolve to IMS environment from token'))
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
  const retVal = 'some return value'
  rp.mockImplementation(() => retVal)

  // no client_id and no_client_secret, shouldn't fail
  await expect(ims.invalidateToken(token)).resolves.toBeTruthy()

  const clientId = 'some-client-id'
  const clientSecret = 'some-client-secret'

  return expect(ims.invalidateToken(token, clientId, clientSecret)).resolves.toEqual(retVal)
})

test('Ims.exchangeJwtToken', async () => {
  const ims = new Ims()

  const serverResponsePayload = {
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token'
  }

  // have some return value from request module
  rp.mockImplementation(() => JSON.stringify(serverResponsePayload))

  const clientId = 'some-client-id'
  const clientSecret = 'some-client-secret'
  const signedJwtToken = 'signed-jwt-token'

  return expect(ims.exchangeJwtToken(clientId, clientSecret, signedJwtToken))
    .resolves.toEqual({ payload: JSON.stringify(serverResponsePayload) })
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
    .rejects.toEqual(new Error('Unknown type of authCode: unknown_type'))

  const serverResponsePayload = {
    access_token: 'my-access-token',
    refresh_token: 'my-refresh-token'
  }

  // have some return value from request module
  rp.mockImplementation(() => JSON.stringify(serverResponsePayload))

  // authorization_code type
  payload.type = 'authorization_code'
  authCode = createTokenFromPayload(payload)

  await expect(ims.getAccessToken(authCode, clientId, clientSecret, scopes))
    .resolves.toEqual({ payload: JSON.stringify(serverResponsePayload) })

  // refresh_token type
  payload.type = 'refresh_token'
  authCode = createTokenFromPayload(payload)

  return expect(ims.getAccessToken(authCode, clientId, clientSecret, scopes))
    .resolves.toEqual({ payload: JSON.stringify(serverResponsePayload) })
})

test('Ims.post', async () => {
  const ims = new Ims()
  const retVal = 'data'

  // have some return value from request module
  rp.mockImplementation(() => retVal)

  return expect(ims.post('api', 'token', 'parameters')).resolves.toEqual(retVal)
})

test('Ims.get', async () => {
  const ims = new Ims()
  const retVal = 'data'

  // have some return value from request module
  rp.mockImplementation(() => retVal)

  // with data
  await expect(ims.get('api', 'token', 'parameters')).resolves.toEqual(retVal)
  // no data
  return expect(ims.get('api', 'token')).resolves.toEqual(retVal)
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
