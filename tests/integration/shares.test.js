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
  secondaryEmail,
  unregisteredEmail,
  createSensorWithData,
  createWhitelistedGateway,
  removeWhitelistedGateway
} = require('./common');
const { randomMac } = require('./integrationHelpers');

// Set up some defaults
const newSensorMac = utils.randomMac();
let individualAlertGatewayMac = null;
let individualAlertGatewaySecret = null;
let individualAlertGatewayConnection = null;

describe('Shares test suite', () => {
  beforeEach(async () => {
    individualAlertGatewayMac = utils.randomMac();
    individualAlertGatewaySecret = utils.randomMac();
    individualAlertGatewayConnection = await createWhitelistedGateway(individualAlertGatewayMac, individualAlertGatewaySecret);
  });

  afterEach(async () => {
    await removeWhitelistedGateway(individualAlertGatewayMac);
    individualAlertGatewayConnection = null;
  });

  itif(RI)('`claim` and record data is successful (PRE-REQUISITE)', async () => {
    const createDefault = await createSensorWithData(newSensorMac, individualAlertGatewayConnection, null, 'share-default-test-sensor');
    expect(createDefault).toBe(true);
  });

  itif(RI)('`shared` returns an empty array of sensors', async () => {
    const sensorData = await get('shared');
    expect(sensorData.data.data.sensors.length).toBe(0);
  });

  itif(RI)('`share` is successful', async () => {
    let shareResult = null;
    try {
      shareResult = await post('share', {
        sensor: newSensorMac,
        user: secondaryEmail
      });
    } catch (e) {
      console.error('share was unsuccessful', e.response.data);
    }

    expect(shareResult).not.toBeNull();
    expect(shareResult.status).toBe(200);
    expect(shareResult.statusText).toBe('OK');
    expect(shareResult.data.result).toBe('success');

    expect(shareResult.data.data.sensor).toBe(newSensorMac);

    // Verify share being found
    let userShareData = null;
    try {
      userShareData = await get('shared');
    } catch (e) {
      console.error('Failed to fetch user data', e.response.data);
    }
    expect(userShareData).not.toBeNull();
    expect(userShareData.data.data.sensors.length).toBeGreaterThan(0);

    const sharedSensorData = userShareData.data.data.sensors.find(s => s.sensor === newSensorMac);
    expect(sharedSensorData.sensor).toBe(newSensorMac);
    expect(sharedSensorData.public).toBe(false);
    expect(sharedSensorData.sharedTo).toBe(secondaryEmail);
  });

  itif(RI)('`getSensorList` shows `sharedToMe`', async () => {
    let userShareData = null;
    try {
      userShareData = await get('sensors', {}, secondaryHttp);
    } catch (e) {
      console.error('Failed to fetch user data', e.response.data);
    }
    expect(userShareData).not.toBeNull();
    expect(userShareData.data.data.sharedToMe.length).toBeGreaterThan(0);

    const sharedSensorData = userShareData.data.data.sharedToMe.find(s => s.sensor === newSensorMac);
    expect(sharedSensorData.sensor).toBe(newSensorMac);
    expect(sharedSensorData.public).toBe(false);
  });

  itif(RI)('`share` is successful and shows original name', async () => {
    const sharedWithNameMac = randomMac();
    const sharedWithNameName = 'TEST-WITH-NAME-ORIGINALöööäöäö';

    const createResult = await createSensorWithData(sharedWithNameMac, individualAlertGatewayConnection, null, sharedWithNameName);
    expect(createResult).toBe(true);

    let shareResult = null;
    try {
      shareResult = await post('share', {
        sensor: sharedWithNameMac,
        user: secondaryEmail
      });
    } catch (e) {
      console.log('share failed', e.response.data);
    }
    expect(shareResult).not.toBeNull();
    expect(shareResult.status).toBe(200, 'share result: ' + shareResult.status);

    // Verify share being found
    let sharedSensorData = null;
    try {
      sharedSensorData = await get('get', { sensor: sharedWithNameMac }, secondaryHttp);
    } catch (e) {
      console.log('get failed', e);
      expect(false).toBe(true);
    }
    expect(sharedSensorData).not.toBeNull();
    expect(sharedSensorData.data.data.sensor).toBe(sharedWithNameMac);
    expect(sharedSensorData.data.data.name).toBe(sharedWithNameName);

    await post('unclaim', {
      sensor: sharedWithNameMac
    });
  });

  itif(RI)('`unclaim` (TO BE DEPRECATED) on sharee unshares sensor', async () => {
    const sharedWithNameMac = randomMac();
    const sharedWithNameName = 'TEST-FOR-UNSHARING-VIA-UNCLAIM';

    const createResult = await createSensorWithData(sharedWithNameMac, individualAlertGatewayConnection, null, sharedWithNameName);
    expect(createResult).toBe(true);

    let shareResult = null;
    try {
      shareResult = await post('share', {
        sensor: sharedWithNameMac,
        user: secondaryEmail
      });
    } catch (e) {
      console.log('share failed', e.response.data);
    }
    expect(shareResult).not.toBeNull();
    expect(shareResult.status).toBe(200, 'share result: ' + shareResult.status);

    // Verify share being found
    let sharedSensorData = null;
    try {
      sharedSensorData = await get('get', { sensor: sharedWithNameMac }, secondaryHttp);
    } catch (e) {
      console.log('get failed', e);
      expect(false).toBe(true);
    }
    expect(sharedSensorData).not.toBeNull();
    expect(sharedSensorData.data.data.sensor).toBe(sharedWithNameMac);
    expect(sharedSensorData.data.data.name).toBe(sharedWithNameName);

    const unclaimResult = await post('unclaim', {
      sensor: sharedWithNameMac
    }, secondaryHttp);
    expect(unclaimResult).not.toBeNull();
    expect(unclaimResult.status).toBe(200, 'unclaim result: ' + unclaimResult.status);

    // Verify that was not unclaimed from owner
    let originalSensorData = null;
    try {
      originalSensorData = await get('get', { sensor: sharedWithNameMac });
    } catch (e) {
      console.log('get failed', e);
      expect(false).toBe(true);
    }
    expect(originalSensorData).not.toBeNull();
    expect(originalSensorData.data.data.sensor).toBe(sharedWithNameMac);
    expect(originalSensorData.data.data.name).toBe(sharedWithNameName);

    // Verify that sensor share has been removed
    let threw = false;
    try {
      await get('get', { sensor: sharedWithNameMac }, secondaryHttp);
    } catch (e) {
      expect(e.response.status).toBe(403);
      threw = true;
    }
    expect(threw).toBe(true, 'expected to fail with 403');

    // CLEAN UP
    await post('unclaim', {
      sensor: sharedWithNameMac
    });
  });

  itif(RI)('`share` is successful and shows name set by sharee', async () => {
    const sharedWithNameMac = randomMac();
    const sharedWithNameName = 'TEST-WITH-NAME';
    const sharedWithNameShareeName = 'SHAREE-WITH-NAME';

    const createResult = await createSensorWithData(sharedWithNameMac, individualAlertGatewayConnection, null, sharedWithNameName);
    expect(createResult).toBe(true);

    let shareResult = null;
    try {
      shareResult = await post('share', {
        sensor: sharedWithNameMac,
        user: secondaryEmail
      });
    } catch (e) {
      console.log('share failed', e.response.data);
      expect(false).toBe(true);
    }
    expect(shareResult).not.toBeNull();
    expect(shareResult.status).toBe(200, 'share result: ' + shareResult.status);

    // Update the sharee's sensor name
    try {
      await post('update', {
        sensor: sharedWithNameMac,
        name: sharedWithNameShareeName
      }, secondaryHttp);
    } catch (e) {
      console.log('Update failed', e.response.data);
      expect(false).toBe(true);
    }

    // Verify share being found
    let thrown = false;
    let sharedSensorData = null;
    try {
      sharedSensorData = await get('get', { sensor: sharedWithNameMac }, secondaryHttp);
    } catch (e) {
      console.log('error thrown when getting', e.response.data);
      thrown = true;
    }
    expect(thrown).toBe(false);
    expect(sharedSensorData.data.data.sensor).toBe(sharedWithNameMac);
    expect(sharedSensorData.data.data.name).toBe(sharedWithNameShareeName);

    const userData = await get('user', {}, secondaryHttp);
    expect(userData.data.data.email).toBe(secondaryEmail);
    const sharedSensor = userData.data.data.sensors.find(s => s.sensor === sharedWithNameMac);

    try {
      await post('unclaim', {
        sensor: sharedWithNameMac
      });
    } catch (e) {
      console.error('Failed to unclaim sensor', e.response.data);
    }

    expect(sharedSensor.name).toBe(sharedWithNameShareeName);
  });

  itif(RI)('`sensors` returns the proper response with shared and unshared sensors', async () => {
    let sensorData = null;
    try {
      sensorData = await get('sensors');
    } catch (e) {
      console.error('failed to get sensor data', e.response.data);
    }

    expect(sensorData).not.toBeNull();
    expect(sensorData.data.data.sensors).not.toBeNull();
    const newSensor = sensorData.data.data.sensors.find(s => s.sensor === newSensorMac);
    expect(newSensor.sharedTo.length).toBe(1);
  });

  itif(RI)('`sensors` works filtered to a single sensor', async () => {
    const sensorData = await get('sensors', {
      sensor: newSensorMac
    });

    const newSensor = sensorData.data.data.sensors.find(s => s.sensor === newSensorMac);
    expect(newSensor).not.toBeNull();
    expect(newSensor.sharedTo.length).toBe(1);
    expect(newSensor.sharedTo[0]).toBe(secondaryEmail);
  });

  // DEPENDENT ON THE ABOVE
  itif(RI)('`unshare` is successful', async () => {
    const unshareResult = await post('unshare', {
      sensor: newSensorMac,
      user: secondaryEmail
    });

    expect(unshareResult.status).toBe(200);
    expect(unshareResult.statusText).toBe('OK');
    expect(unshareResult.data.result).toBe('success');

    const userShareData = await get('shared');
    const newSensor = userShareData.data.data.sensors.find(s => s.sensor === newSensorMac);
    expect(newSensor).not.toBeDefined();

    // Ensure the owner still has the sensor
    const sensorData = await get('sensors');
    const sensorCheck = sensorData.data.data.sensors.find(s => s.sensor === newSensorMac);
    expect(sensorCheck).toBeDefined();
  });

  itif(RI)('`share` to unregistered is successful', async () => {
    const shareResult = await post('share', {
      sensor: newSensorMac,
      user: unregisteredEmail
    });

    expect(shareResult.status).toBe(200);
    expect(shareResult.statusText).toBe('OK');
    expect(shareResult.data.result).toBe('success');

    expect(shareResult.data.data.sensor).toBe(newSensorMac);
  });

  itif(RI)('`unshare` by sharee is successful', async () => {
    const shareResult = await post('share', {
      sensor: newSensorMac,
      user: secondaryEmail
    });

    expect(shareResult.status).toBe(200, 'Share step');

    const unshareResult = await post('unshare', {
      sensor: newSensorMac
    }, secondaryHttp);

    expect(unshareResult.status).toBe(200);
    expect(unshareResult.statusText).toBe('OK');
    expect(unshareResult.data.result).toBe('success');

    const userShareData = await get('shared');
    const newSensor = userShareData.data.data.sensors.find(s => s.sensor === newSensorMac);
    expect(newSensor).not.toBeDefined();
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
});
