import { getToken, context, Ims, ValidationCache, ACCESS_TOKEN, REFRESH_TOKEN, AUTHORIZATION_CODE, CLIENT_ID, CLIENT_SECRET, SCOPE, getTokenData } from '../src/index';

// Test usage of getToken
async function testGetToken() {
  const tokenPromise: Promise<string> = getToken('testContext', {
    scope: 'additional_scope',
    force: false
  });
  const token: string = await tokenPromise;
  console.log(token);
}

// Test usage of context
async function testContext() {
  if (context) {
    const currentContextName: Promise<string> = context.getCurrent();
    console.log(await currentContextName);

    const contextDataPromise: Promise<object> = context.get('someKey');
    console.log(await contextDataPromise);
  }
}

// Test usage of Ims
function testIms() {
  const imsInstance = new Ims('prod');
  console.log(imsInstance.imsHost);
}

// Test usage of ValidationCache
function testValidationCache() {
  const cacheKey = 'testCacheKey';
  const cacheValue = { data: 'testData' };
  ValidationCache.set(cacheKey, cacheValue);
  const retrievedValue: { data: string } | undefined = ValidationCache.get(cacheKey);
  console.log(retrievedValue);
  ValidationCache.invalidate(cacheKey);
}

// Test usage of constants
function testConstants() {
  const accessTokenKey: string = ACCESS_TOKEN;
  const refreshTokenKey: string = REFRESH_TOKEN;
  const authCodeKey: string = AUTHORIZATION_CODE;
  const clientIdKey: string = CLIENT_ID;
  const clientSecretKey: string = CLIENT_SECRET;
  const scopeKey: string = SCOPE;
  console.log(accessTokenKey, refreshTokenKey, authCodeKey, clientIdKey, clientSecretKey, scopeKey);
}

// Test usage of getTokenData
async function testGetTokenData() {
    const tokenData = await getTokenData('jwtTokenString');
    if (tokenData) {
        console.log(tokenData.client_id, tokenData.user_id, tokenData.expires_in);
    }
}

// Call test functions (optional, mainly for linting if functions are unused)
testGetToken();
testContext();
testIms();
testValidationCache();
testConstants();
testGetTokenData();

console.log('Type test file created. Type checking will determine success.');
