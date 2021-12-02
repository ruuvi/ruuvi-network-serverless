const { describe, expect } = require('@jest/globals');

/**
 * @jest-environment node
 */

/**
 * General test suite for the back-end.
 */
const {
  utils,

  itif,
  post,

  RI,

  internalHttp,
  httpWithInvalidSignature,

  sleep
} = require('./common');
const { randomMac, randomHex } = require('./integrationHelpers');
const errorCodes = require('../../Helpers/errorCodes.js');

// Set up some defaults
const newSensorMac = utils.randomMac();
const testData = utils.randomHex(32);

describe('Full integration tests', () => {
  // INTERNAL
  itif(RI)('`whitelist` without internal token fails', async () => {
    // toThrow failed for some reason [temporary workaround]
    let threw = false;
    try {
      await post('whitelist', {
        macAddress: 'ab:ba:cd:ba:ca:ba',
        secret: '1234'
      });
    } catch (e) {
      expect(e.message).toMatch(/Request failed with status code 403/);
      threw = true;
    }
    expect(threw).toBe(true);
  });

  itif(RI)('`whitelist` with internal token succeeds', async () => {
    const newGwMac = randomMac();

    const tags = {};
    tags[newSensorMac] = {
      rssi: -76,
      timestamp: Date.now() - 50,
      data: testData
    };

    let rejected = false;
    try {
      await post('record', {
        data: {
          coordinates: '',
          timestamp: Date.now(),
          gw_mac: newGwMac,
          tags: tags
        }
      }, httpWithInvalidSignature);
    } catch (e) {
      rejected = true;
    }
    expect(rejected).toBe(true, 'rejected signature');

    await sleep(1000);

    const result = await post('whitelist', {
      macAddress: newGwMac,
      secret: randomHex(64)
    }, internalHttp);

    expect(result.status).toBe(200);
    expect(result.data.data.gateway.macAddress).toBe(newGwMac);

    // Attempt to blacklist
    const blacklistResult = await post('blacklist', {
      macAddress: newGwMac
    }, internalHttp);

    expect(blacklistResult.status).toBe(200);
    expect(blacklistResult.data.data.gateway).toBe(newGwMac);
  });

  itif(RI)('`whitelist` with already whitelisted fails', async () => {
    const newGwMac = randomMac();

    const tags = {};
    tags[newSensorMac] = {
      rssi: -76,
      timestamp: Date.now() - 50,
      data: testData
    };

    let rejected = false;
    try {
      await post('record', {
        data: {
          coordinates: '',
          timestamp: Date.now(),
          gw_mac: newGwMac,
          tags: tags
        }
      }, httpWithInvalidSignature);
    } catch (e) {
      rejected = true;
    }
    expect(rejected).toBe(true);

    await sleep(1000);

    const result = await post('whitelist', {
      macAddress: newGwMac,
      secret: randomHex(64)
    }, internalHttp);

    expect(result.status).toBe(200);
    expect(result.data.data.gateway.macAddress).toBe(newGwMac);

    let thrown = false;
    try {
      await post('whitelist', {
        macAddress: newGwMac,
        secret: randomHex(64)
      }, internalHttp);
    } catch (e) {
      expect(e.response.status).toBe(409);
      expect(e.response.data.code).toBe(errorCodes.ER_GATEWAY_ALREADY_WHITELISTED);
      thrown = true;
    }
    expect(thrown).toBe(true);
  });

  itif(RI)('`whitelist` on unseen gateway fails', async () => {
    const newGwMac = randomMac();

    let thrown = false;

    try {
      await post('whitelist', {
        macAddress: newGwMac,
        secret: randomHex(64)
      }, internalHttp);
    } catch (e) {
      expect(e.response.status).toBe(409);
      expect(e.response.data.result).toBe('error');
      expect(e.response.data.code).toBe(errorCodes.ER_GATEWAY_NOT_FOUND);
      expect(e.response.data.error).toBe('Request was valid, but gateway has not been seen yet.');
      thrown = true;
    }
    expect(thrown).toBe(true);
  });

//  itif(RI)('`gwinfo` returns data for whitelisted gateway', async () => {
//    const newGWMac = randomMac();
//    const whitelistResult = await post('whitelist', {
//      macAddress: newGWMac,
//      secret: randomHex(64)
//    }, internalHttp);
//    expect(whitelistResult.status).toBe(200, 'successfully whitelisted');
//
//      TODO: SEND UPDATE FROM GW
//
//    const gwinfoResult = await get('gwinfo', {
//      gateway: newGWMac
//    }, internalHttp);
//
//    expect(gwinfoResult.status).toBe(200);
//    expect(gwinfoResult.data.data.gateway.GatewayId).toBe(newGWMac);
//    expect(gwinfoResult.data.data.gateway.InvalidSignatureTimestamp).toBe(0);
//    expect(gwinfoResult.data.data.gateway.Connected).toBe(0);
//    expect(gwinfoResult.data.data.gateway.Latest).toBe(0);
//    expect(gwinfoResult.data.data.gateway.Whitelisted).toBe(0);
//  });
});
