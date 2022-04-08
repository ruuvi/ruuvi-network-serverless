const { afterEach, beforeEach, describe, expect } = require('@jest/globals');
const {
  createSensorWithData,
  createWhitelistedGateway,
  removeWhitelistedGateway,
  get,
  itif,
  post,
  primaryEmail,
  randomMac,
  RI
} = require('./common');

const emailHelper = require('../../Helpers/emailHelper');
const { HTTPCodes } = require('../../Helpers/gatewayHelper');

let individualAlertGatewayMac = null;
let individualAlertGatewaySecret = null;
let individualAlertGatewayConnection = null;

describe('Check owner email tests', () => {
  beforeEach(() => {
    individualAlertGatewayMac = randomMac();
    individualAlertGatewaySecret = randomMac();
    individualAlertGatewayConnection = createWhitelistedGateway(individualAlertGatewayMac, individualAlertGatewaySecret);
  });

  afterEach(() => {
    removeWhitelistedGateway(individualAlertGatewayMac);
    individualAlertGatewayConnection = null;
  });

  itif(RI)('Unregistered sensor returns empty string', async () => {
    try {
      const response = await get('check', {
        sensor: randomMac()
      });
      expect(response.status).toBe(HTTPCodes.OK);
      expect(response.data.email).toBe('');
    } catch (e) {
      expect(true).toBe('Check endpoint returned error code');
    }
  });

  itif(RI)('Registered, unclaimed sensor returns empty string', async () => {
    const newSensorMac = randomMac();
    try {
      createSensorWithData(newSensorMac, individualAlertGatewayConnection, null, 'share-default-test-sensor', false);
      const response = await get('check', {
        sensor: newSensorMac
      });
      expect(response.status).toBe(HTTPCodes.OK);
      expect(response.data.email).toBe('');
    } catch (e) {
      expect(true).toBe('Check endpoint returned error code');
    }
  });

  itif(RI)('Registered, claimed sensor returns masked email', async () => {
    const newSensorMac = randomMac();
    try {
      createSensorWithData(newSensorMac, individualAlertGatewayConnection, null, 'share-default-test-sensor', true);
      const response = await get('check', {
        sensor: newSensorMac
      });
      expect(response.status).toBe(HTTPCodes.OK);
      expect(response.data.email).toBe(emailHelper.maskEmail(primaryEmail));
      await post('unclaim', {
        sensor: newSensorMac
      });
    } catch (e) {
      expect(true).toBe('Check endpoint returned error code');
    }
  });

  itif(RI)('Request without sensor ID returns HTTP INVALID', async () => {
    try {
      const response = await get('check', {
      });
      expect(response.status).toBe(HTTPCodes.INVALID);
    } catch (e) {
      expect(e.response.status).toBe(HTTPCodes.INVALID);
    }
  });

  itif(RI)('Request with malformed sensor ID returns HTTP INVALID', async () => {
    try {
      const response = await get('check', {
        sensor: 'This is not a MAC Address!'
      });
      expect(response.status).toBe(HTTPCodes.INVALID);
    } catch (e) {
      expect(e.response.status).toBe(HTTPCodes.INVALID);
    }
  });
});
