const { expect, test } = require('@jest/globals');
const dataHelper = require('../../Helpers/sensorDataHelper');

// Test vectors at https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2#test-vectors
const df5ValidParsed =
    {
      temperature: 24.30,
      humidity: 53.49,
      pressure: 100044,
      accelerationX: 4,
      accelerationY: -4,
      accelerationZ: 1036,
      battery: 2977,
      txPower: 4,
      movementCounter: 66,
      measurementSequenceNumber: 205,
      mac: 'CB:B8:33:4C:88:4F'
    };

const df5ValidHex = '0201061BFF99040512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F';

test('Data Format 5 parses correctly', () => {
  const result = dataHelper.parseData(df5ValidHex);
  expect(result.temperature).toBe(df5ValidParsed.temperature);
  expect(result.humidity).toBe(df5ValidParsed.humidity);
  expect(result.pressure).toBe(df5ValidParsed.pressure);
  expect(result.accelerationX).toBe(df5ValidParsed.accelerationX);
  expect(result.accelerationY).toBe(df5ValidParsed.accelerationY);
  expect(result.accelerationZ).toBe(df5ValidParsed.accelerationZ);
  expect(result.battery).toBe(df5ValidParsed.battery);
  expect(result.txPower).toBe(df5ValidParsed.txPower);
  expect(result.movementCounter).toBe(df5ValidParsed.movementCounter);
  expect(result.measurementSequenceNumber).toBe(df5ValidParsed.measurementSequenceNumber);
  expect(result.mac).toBe(df5ValidParsed.mac);
});
