const { afterEach, beforeEach, describe, expect } = require('@jest/globals');

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
  createWhitelistedGateway,
  removeWhitelistedGateway
} = require('./common');
const { randomMac, randomHex } = require('./integrationHelpers');

let gatewayMac = null;
let gatewaySecret = null;
let gatewayConnection = null;

function createSensorDataArray () {
  const tags = {};

  for (let ii = 0; ii < 100; ii++) {
    const data = randomHex(32);
    tags[randomMac()] = {
      rssi: -76,
      timestamp: Date.now() - 50,
      data: data
    };
  }
  return tags;
}

describe('Gateway Receiver test suite', () => {
  beforeEach(async () => {
    gatewayMac = utils.randomMac();
    gatewaySecret = utils.randomMac();
    gatewayConnection = await createWhitelistedGateway(gatewayMac, gatewaySecret);
  });

  afterEach(async () => {
    await removeWhitelistedGateway(gatewayMac);
    gatewayConnection = null;
  });

  itif(RI)('GatewayReceiver can accept up to 100 sensors in HTTP POST', async () => {
    let recordResult = null;

    try {
      const tags = createSensorDataArray();
      recordResult = await post('record', {
        data: {
          coordinates: '',
          timestamp: Date.now(),
          gw_mac: gatewayConnection.ruuviMac,
          tags: tags
        }
      }, gatewayConnection);
    } catch (e) {
      console.error('failed to record data');
    }
    expect(recordResult.status).toBe(200);
  });
});
