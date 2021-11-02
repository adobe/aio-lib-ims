/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { AUTHORIZATION_CODE, getTokenData, Ims } = require('../src/ims')
const path = require('path')
// load .env values in the e2e folder, if any
require('dotenv').config({ path: path.join(__dirname, '.env') })

const {
  IMS_CLIENT_ID,
  IMS_CLIENT_SECRET,
  IMS_SIGNED_JWT
} = process.env

let gImsObj
let gTokens

beforeAll(async () => {
  gImsObj = new Ims()
})

test('init test', async () => {
  expect(IMS_CLIENT_ID).toBeDefined()
  expect(IMS_CLIENT_SECRET).toBeDefined()
  expect(IMS_SIGNED_JWT).toBeDefined()

  expect(gImsObj).toBeDefined()
  expect(typeof gImsObj).toEqual('object')
})

test('getAccessToken', async () => {
  // NOTE: auth code e2e tests cannot be tested for success because they require interaction via the browser (to get the auth code)
  // thus the test here is only for access to the API

  const jsonPayload = {
    type: AUTHORIZATION_CODE
  }
  const payload = Buffer.from(JSON.stringify(jsonPayload)).toString('base64')
  const authCode = `xxxxx.${payload}.xxxxx`

  const result = gImsObj.getAccessToken(authCode, IMS_CLIENT_ID, IMS_CLIENT_SECRET, 'openid')
  await expect(result).rejects.toThrow('400') // 400 access_denied
})

test('valid and non-expired signed jwt', () => {
  const [, encodedPayload] = IMS_SIGNED_JWT.split('.', 3)
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64'))

  expect(payload.exp).toBeDefined()
  expect(payload.iss).toBeDefined()
  expect(payload.sub).toBeDefined()
  expect(payload.aud).toBeDefined()
  expect(payload.iat).toBeDefined()

  const expiryDate = new Date(payload.exp * 1000).getTime()
  const now = Date.now()
  const isExpired = (expiryDate - now) <= 0

  expect(isExpired).not.toEqual(true)
})

test('exchangeJwtToken', () => {
  const result = gImsObj.exchangeJwtToken(IMS_CLIENT_ID, IMS_CLIENT_SECRET, IMS_SIGNED_JWT)
  expect(result).toBeDefined()
  return result
    .then(tokens => {
      expect(tokens).toBeDefined()
      gTokens = tokens
    })
    .catch(err => {
      // should not get here if successful
      expect(err).not.toBeDefined()
    })
})

test('getTokenData', async () => {
  expect(gTokens).toBeDefined()
  expect(typeof gTokens).toEqual('object')

  const result = getTokenData(gTokens.access_token.token)
  expect(typeof result).toEqual('object')
  expect(result).toMatchObject({
    type: 'access_token',
    expires_in: expect.any(String),
    created_at: expect.any(String),
    client_id: IMS_CLIENT_ID
  })
})

test('getOrganizations', async () => {
  expect(gTokens).toBeDefined()
  expect(typeof gTokens).toEqual('object')

  const result = gImsObj.getOrganizations(gTokens.access_token.token)
  return result
    .then(data => {
      expect(Array.isArray(data)).toBeTruthy()
    })
    .catch(err => {
      // should not get here if successful
      expect(err).not.toBeDefined()
    })
})

test('validateToken', async () => {
  expect(gTokens).toBeDefined()
  expect(typeof gTokens).toEqual('object')

  const result = gImsObj.validateToken(gTokens.access_token.token, IMS_CLIENT_ID)
  return expect(result).resolves.toMatchObject({ valid: true })
})

test('invalidateToken', () => {
  expect(gTokens).toBeDefined()
  expect(typeof gTokens).toEqual('object')

  const result = gImsObj.invalidateToken(gTokens.access_token.token, IMS_CLIENT_ID, IMS_CLIENT_SECRET)
  return expect(result).resolves.toBe('')
})
