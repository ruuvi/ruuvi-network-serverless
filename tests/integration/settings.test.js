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

  RI
} = require('./common');

describe('Settings endpoint test suite', () => {
  itif(RI)('`settings` insert is successful', async () => {
    const randomKey = utils.randomHex(16);
    const randomValue = utils.randomHex(16);

    const settingsResult = await post('settings', {
      name: randomKey,
      value: randomValue
    });

    expect(settingsResult.status).toBe(200, 'Insert step');
    expect(settingsResult.data.data.action).toBe('added');
  });

  itif(RI)('`settings` read is successful', async () => {
    // Create a new key
    const randomKey = utils.randomHex(16);
    const randomValue = utils.randomHex(16);

    const settingsResult = await post('settings', {
      name: randomKey,
      value: randomValue
    });
    expect(settingsResult.status).toBe(200, 'Insert step');

    // Read new key
    const getSettingsResult = await get('settings');
    expect(getSettingsResult.status).toBe(200, 'Read step');
    expect(getSettingsResult.data.data.settings[randomKey]).toBe(randomValue);
  });

  itif(RI)('`settings` update is successful', async () => {
    // Create a new key
    const randomKey = utils.randomHex(16);
    const randomValue = utils.randomHex(16);

    const settingsResult = await post('settings', {
      name: randomKey,
      value: randomValue
    });
    expect(settingsResult.status).toBe(200, 'Insert step');

    // Update new key
    const updatedRandomValue = utils.randomHex(16);

    const updateSettingsResult = await post('settings', {
      name: randomKey,
      value: updatedRandomValue
    });
    expect(updateSettingsResult.status).toBe(200, 'Update step');

    const getUpdatedSettingsResult = await get('settings');
    expect(getUpdatedSettingsResult.status).toBe(200, 'Read step');
    expect(getUpdatedSettingsResult.data.data.settings[randomKey]).toBe(updatedRandomValue);
  });
});
