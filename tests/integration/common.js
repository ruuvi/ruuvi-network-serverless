const { it } = require('@jest/globals');

/**
 * Runs a load test against the given end-point
 */
const querystring = require('querystring');
const axios = require('axios');
const utils = require('./integrationHelpers');

// Only run when condition is met; used for skipping tests
const itif = (condition) => condition ? it : it.skip;

// Load configuration
const stage = process.env.STAGE ? process.env.STAGE : 'dev';
const stageConfig = require('./integrationCredentials');

const baseURL = stageConfig[stage].url;
const primaryToken = stageConfig[stage].primary;
const secondaryToken = stageConfig[stage].secondary;
const primaryEmail = stageConfig[stage].primaryEmail;
const secondaryEmail = stageConfig[stage].secondaryEmail;
const unregisteredEmail = stageConfig[stage].unregisteredEmail;
const internalKey = stageConfig[stage].internalKey;

// Release test
const RI = process.env.IS_INTEGRATION_TEST;
const PRODUCTION = process.env.STAGE === 'prod';

const testData = utils.randomHex(32);

/**
 * HTTP Client with Authorization set up
 */
const instance = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${primaryToken}`
  }
});

/**
 * HTTP Client with Authorization set up
 */
const secondaryHttp = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${secondaryToken}`
  }
});

/**
 * HTTP Client without signature
 */
const httpWithInvalidSignature = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${primaryToken}`,
    'Ruuvi-HMAC-SHA256': 'invalidsignature'
  }
});

/**
 * HTTP Client with Authorization set up
 */
const internalHttp = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    'X-Internal-Secret': internalKey
  }
});

/**
 * Perform GET call to the back-end
 *
 * @param {string} endpoint
 * @param {object} queryParams
 */
const get = async (endpoint, queryParams, client = null) => {
  client = client || instance;
  return await client.get('/' + endpoint + '?' + querystring.stringify(queryParams));
};

/**
 * Performs a POST call to the back-end
 *
 * @param {string} endpoint
 * @param {object} body
 */
const post = async (endpoint, body, client = null) => {
  client = client || instance;
  return await client.post('/' + endpoint, body);
};

const sleep = async (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const createSensorWithData = async (macAddress, gatewayMac, data = null, name = null, claim = true) => {
  const payload = { sensor: macAddress };
  if (name !== null) {
    payload.name = name;
  }

  if (data === null) {
    data = testData;
  }

  try {
    await post('claim', payload);
  } catch (e) {
    console.error('claim failed', e);
    return false;
  }

  const tags = {};
  tags[macAddress] = {
    rssi: -76,
    timestamp: Date.now() - 50,
    data: data
  };

  let recordResult = null;
  try {
    recordResult = await post('record', {
      data: {
        coordinates: '',
        timestamp: Date.now(),
        gw_mac: gatewayMac,
        tags: tags
      }
    });
  } catch (e) {
    console.error('failed to record data', e);
  }

  // Wait for data to show up
  let failed = 0;
  for (let i = 0; i < 10; i++) {
    try {
      const readResult = await get('get', { sensor: macAddress });
      if (!readResult.data || !readResult.data.total) {
        await sleep(500);
        continue;
      }
      break;
    } catch (e) {
      failed++;
    }
  }
  if (failed > 0) {
    console.log('failed attempts: ' + failed);
  }

  if (!claim || recordResult === null) {
    await post('unclaim', {
      sensor: macAddress
    });
  }

  return true;
};

module.exports = {
  utils,

  RI,
  PRODUCTION,

  itif,
  get,
  post,

  internalHttp,
  secondaryHttp,
  httpWithInvalidSignature,
  primaryEmail,
  secondaryEmail,
  unregisteredEmail,

  createSensorWithData,

  internalKey,

  sleep
};
