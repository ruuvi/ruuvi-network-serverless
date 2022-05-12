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

describe('Get latest datapoint test suite', () => {
  itif(RI)('Valid query returns latest datapoint of each sensor', async () => {
    expect(true).toBe(false);
  });

  itif(RI)('Valid query returns empty response if there are no claimed sensors for account', async () => {
    expect(true).toBe(false);
  });

  itif(RI)('Unauthenticated query returns 403', async () => {
    expect(true).toBe(false);
  });
});
