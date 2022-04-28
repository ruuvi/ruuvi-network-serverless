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
  get,
  post,

  RI,

  secondaryHttp,

  primaryEmail,
  unregisteredEmail,

  sleep,
  createSensorWithData,
  createWhitelistedGateway,
  removeWhitelistedGateway
} = require('./common');
const { randomMac } = require('./integrationHelpers');

// Set up some defaults
const newSensorMac = utils.randomMac();
const testData = utils.randomHex(32);

let individualGatewayMac = null;
let individualGatewaySecret = null;
let individualGatewayConnection = null;

const maxClaims = 25;

describe('[LEGACY] Remaining uncategorized tests', () => {
  beforeEach(async () => {
    individualGatewayMac = utils.randomMac();
    individualGatewaySecret = utils.randomMac();
    individualGatewayConnection = await createWhitelistedGateway(individualGatewayMac, individualGatewaySecret);
  });

  afterEach(async () => {
    await removeWhitelistedGateway(individualGatewayMac);
    individualGatewayConnection = null;
  });

  // USER
  itif(RI)('`register` returns 200 OK', async () => {
    const registerResult = await post('register', {
      email: unregisteredEmail
    });
    expect(registerResult.status).toBe(200);
    expect(registerResult.statusText).toBe('OK');
    expect(registerResult.token).not.toBeNull();
  });

  itif(RI)('`verify` fails with invalid token', async () => {
    // toThrow failed for some reason [temporary workaround]
    let threw = false;
    try {
      await get('verify', {
        token: 'definitely_faulty_token'
      });
    } catch (e) {
      expect(e.message).toMatch(/Request failed with status code 403/);
      threw = true;
    }
    expect(threw).toBe(true);
  });

  // itif(RI)('`verify` succeeds with valid token', async () => {
  //  // DEPENDENCY: This verifies previous test
  //  expect(registrationToken).not.toBeNull();

  //  // toThrow failed for some reason [temporary workaround]
  //  let threw = false;
  //  const verifyResult = await get('verify', {
  //    token: registrationToken
  //  });

  //  expect(verifyResult.status).toBe(200);
  //  expect(verifyResult.statusText).toBe('OK');

  //  // TODO: We could do remainder of the tests with this user
  // });

  itif(RI)('`record` is successful', async () => {
    const result = await createSensorWithData(newSensorMac, individualGatewayConnection, testData, null, false);
    expect(result).toBe(true);
  });

  itif(RI)('`record` triggers a throttle when updated with same gateway', async () => {
    const tags = {};
    tags[newSensorMac] = {
      rssi: -76,
      timestamp: Date.now() - 50,
      data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E'
    };

    try {
      await post('record', {
        data: {
          coordinates: '',
          timestamp: Date.now(),
          gw_mac: individualGatewayMac,
          tags: tags
        }
      }, individualGatewayConnection);

      await post('record', {
        data: {
          coordinates: '',
          timestamp: Date.now(),
          gw_mac: individualGatewayMac,
          tags: tags
        }
      }, individualGatewayConnection);
    } catch (e) {
      expect(e.response.status).toBe(429); // Throttled
      expect(e.response.data.code).toBe('ER_THROTTLED');
    }
  });

  itif(RI)('`user` returns email', async () => {
    const userData = await get('user');
    expect(userData.data.data.email).toBe(primaryEmail);
  });

  itif(RI)('`claim` returns 200 OK', async () => {
    const claimResult = await post('claim', {
      sensor: newSensorMac
    });
    expect(claimResult.status).toBe(200);
    expect(claimResult.statusText).toBe('OK');
  });

  itif(RI)('`claim` on already claimed returns 409 Conflict', async () => {
    let caught = false;
    try {
      await post('claim', {
        sensor: newSensorMac
      }, secondaryHttp);
    } catch (e) {
      expect(e.message).toMatch(/Request failed with status code 409/);

      const maskEmail = require('../../Helpers/emailHelper').maskEmail;
      const maskedEmail = maskEmail(primaryEmail);

      expect(e.response.data.error).toBe(`Sensor already claimed by ${maskedEmail}.`);
      caught = true;
    }
    expect(caught).toBe(true);
  });

  // This might fail if Kinesis processing above is slow
  itif(RI)('`get` returns dense sensor data', async () => {
    // NOTICE! The data might take a little bit to go through the stream so we retry a couple of times
    let sensorData = null;

    for (let retry = 0; retry < 3; retry++) {
      sensorData = await get('get', { sensor: newSensorMac, mode: 'dense' });
      if (sensorData.data.data.measurements.length > 0) {
        break;
      }
      await sleep(1000);
    }

    expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
    expect(sensorData.data.data.measurements[0].data).toBe(testData);
  });

  // This might fail if Kinesis processing above is slow
  itif(RI)('`get` returns sparse sensor data', async () => {
    const sensorData = await get('get', { sensor: newSensorMac, mode: 'sparse' });
    expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
    expect(sensorData.data.data.measurements[0].data).toBe(testData);
  });

  // This might fail if Kinesis processing above is slow
  itif(RI)('`get` returns mixed sensor data (only validates argument)', async () => {
    const sensorData = await get('get', { sensor: newSensorMac, mode: 'mixed' });
    expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
    expect(sensorData.data.data.measurements[0].data).toBe(testData);
  });

  itif(RI)('`update` updates sensor data', async () => {
    const testName = 'awesome test sensor';
    const pictureName = 'kek.default.file';
    const updateResult = await post('update', {
      sensor: newSensorMac,
      name: testName,
      public: 0,
      offsetTemperature: 2,
      offsetHumidity: 3,
      offsetPressure: 4,
      picture: pictureName
    });

    expect(updateResult.status).toBe(200);
    expect(updateResult.statusText).toBe('OK');
    expect(updateResult.data.data.name).toBe(testName);
    expect(updateResult.data.data.public).toBe(0);
    expect(updateResult.data.data.offsetTemperature).toBe(2);
    expect(updateResult.data.data.offsetHumidity).toBe(3);
    expect(updateResult.data.data.offsetPressure).toBe(4);
    expect(updateResult.data.data.picture).toBe(pictureName);

    // Test successful update
    const updatedSensorData = await get('get', { sensor: newSensorMac });
    expect(updatedSensorData.data.data.name).toBe(testName);
    expect(updatedSensorData.data.data.public).toBe(0);
    expect(updatedSensorData.data.data.offsetTemperature).toBe(2);
    expect(updatedSensorData.data.data.offsetHumidity).toBe(3);
    expect(updatedSensorData.data.data.offsetPressure).toBe(4);
    expect(updatedSensorData.data.data.picture).toBe(pictureName);
  });

  itif(RI)('`update` updating sensor public flag', async () => {
    const updateResult = await post('update', {
      sensor: newSensorMac,
      public: 1
    });
    expect(updateResult.status).toBe(200);
    expect(updateResult.statusText).toBe('OK');
    expect(updateResult.data.data.public).toBe(1);

    // Verify
    const updatedSensorData = await get('get', { sensor: newSensorMac });
    expect(updatedSensorData.data.data.public).toBe(1);

    const resetPublicFlagResult = await post('update', {
      sensor: newSensorMac,
      public: 0
    });
    expect(resetPublicFlagResult.status).toBe(200);
    expect(resetPublicFlagResult.statusText).toBe('OK');
    expect(resetPublicFlagResult.data.data.public).toBe(0);
  });

  itif(RI)('`update` updates sensor name with unicode (smiley)', async () => {
    const testName = '🤩';
    const updateResult = await post('update', {
      sensor: newSensorMac,
      name: testName
    });

    expect(updateResult.status).toBe(200);
    expect(updateResult.statusText).toBe('OK');
    expect(updateResult.data.data.name === testName).toBe(true);

    // Test successful update
    const updatedSensorData = await get('get', { sensor: newSensorMac });
    expect(updatedSensorData.data.data.name === testName).toBe(true);
  });

  itif(RI)('`upload` gets an image URL to upload to', async () => {
    const uploadLinkResult = await post('upload', {
      sensor: newSensorMac,
      type: 'image/png'
    });
    expect(uploadLinkResult.status).toBe(200);
    expect(uploadLinkResult.statusText).toBe('OK');
    expect(uploadLinkResult.data.data.uploadURL).toContain('https://');
    expect(uploadLinkResult.data.data.uploadURL).toContain('Content-Type=image%2Fpng&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=');
  });

  itif(RI)('`upload` reset gets an empty image URL and guid', async () => {
    const uploadLinkResult = await post('upload', {
      sensor: newSensorMac,
      type: 'image/png',
      action: 'reset'
    });
    expect(uploadLinkResult.status).toBe(200);
    expect(uploadLinkResult.statusText).toBe('OK');
    expect(uploadLinkResult.data.data.uploadURL).toBe('');
    expect(uploadLinkResult.data.data.uploadURL).toBe('');
  });

  itif(RI)('`unclaim` returns 200 OK', async () => {
    const claimResult = await post('unclaim', {
      sensor: newSensorMac
    });
    expect(claimResult.status).toBe(200);
    expect(claimResult.statusText).toBe('OK');

    // toThrow failed for some reason [temporary workaround]
    let threw = false;
    try {
      await get('get', { sensor: newSensorMac });
    } catch (e) {
      expect(e.message).toMatch(/Request failed with status code 403/);
      threw = true;
    }
    expect(threw).toBe(true);
  });

  itif(RI)('can `claim` maximum for subscription', async () => {
    const sensorData = await get('sensors');
    const existingSensors = sensorData.data.data.sensors.length;

    const sensors = [];
    let threw = false;
    let i = 0;
    try {
      for (i = 0; i < maxClaims - existingSensors; i++) {
        const successfulSensor = randomMac();
        const claimResult = await post('claim', {
          sensor: successfulSensor,
          description: `Success ${i}`
        });
        expect(claimResult.status).toBe(200);
        expect(claimResult.statusText).toBe('OK');
        sensors.push(successfulSensor);
      }
    } catch (e) {
      console.error(`Error at claiming index ${i}`, e);
      threw = true;
    }
    expect(threw).toBe(false, 'Claim until max claims');

    let claimResult = 0;
    try {
      const unsuccessfulSensor = randomMac();
      await post('claim', {
        sensor: unsuccessfulSensor
      });
    } catch (e) {
      claimResult = e.response.status;
    }

    // Clean up
    let cleanupError = false;
    for (const sensor of sensors) {
      try {
        const unclaimResult = await post('unclaim', {
          sensor: sensor
        });
        expect(unclaimResult.status).toBe(200);
        expect(unclaimResult.statusText).toBe('OK');
      } catch (e) {
        console.error('Error', e);
        cleanupError = true;
      }
      expect(cleanupError).toBe(false, 'clean up error');
    }

    expect(claimResult).toBe(400);
  });
});
