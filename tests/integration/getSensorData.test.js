const { describe, expect } = require('@jest/globals');

/**
 * Sensor data test suite for the back-end.
 */
const {
  utils,

  itif,
  get,
  post,

  RI,
  // PRODUCTION,

  // secondaryHttp,

  sleep
} = require('./common');

const newSensorMac = utils.randomMac();

// Mock 3 GWs to bypass throttle limit
const GatewayMac1 = utils.randomMac();
const GatewayMac2 = utils.randomMac();
const GatewayMac3 = utils.randomMac();

const testData1 = utils.randomHex(32);
const testData2 = utils.randomHex(32);
const testData3 = utils.randomHex(32);

const momentAgo = Date.now() - 50;
const hourAgo = Date.now() - 60 * 60 * 1000;
// 25 hours to be > 1 day
const dayAgo = Date.now() - 25 * 60 * 60 * 1000;

const nowTags = {};
nowTags[newSensorMac] = {
  rssi: -50,
  timestamp: momentAgo,
  data: testData1
};

const hourTags = {};
hourTags[newSensorMac] = {
  rssi: -50,
  timestamp: hourAgo,
  data: testData2
};

const dayTags = {};
dayTags[newSensorMac] = {
  rssi: -50,
  timestamp: dayAgo,
  data: testData3
};

describe('Sensor data integration test suite', () => {
  itif(RI)('Storing records on backend is successful', async () => {
    try {
      await post('record', {
        data: {
          coordinates: '',
          timestamp: momentAgo,
          gw_mac: GatewayMac1,
          tags: nowTags
        }
      });
    } catch (e) {
      console.log(e);
      expect(true).toBe(false, 'Failed to post data for recent tag');
    }
    try {
      await post('record', {
        data: {
          coordinates: '',
          timestamp: hourAgo,
          gw_mac: GatewayMac2,
          tags: hourTags
        }
      });
    } catch (e) {
      console.log(e);
      expect(true).toBe(false, 'Failed to post data for hour old tag');
    }
    try {
      await post('record', {
        data: {
          coordinates: '',
          timestamp: dayAgo,
          gw_mac: GatewayMac3,
          tags: dayTags
        }
      });
    } catch (e) {
      console.log(e);
      expect(true).toBe(false, 'Failed to post data for day old tag');
    }
  });

  itif(RI)('Mixed fetch returns all data', async () => {
    // Claim sensor to fetch data
    const claimResult = await post('claim', {
      sensor: newSensorMac
    });
    expect(claimResult.status).toBe(200);
    expect(claimResult.statusText).toBe('OK');

    // NOTICE! The data might take a little bit to go through the stream so we retry a couple of times
    let sensorData = null;

    for (let retry = 0; retry < 10; retry++) {
      sensorData = await get('get', { sensor: newSensorMac, mode: 'dense' });
      if (sensorData.data.data.measurements.length > 0) {
        break;
      }
      await sleep(1000);
    }
  });

  // This might fail if Kinesis processing above is slow
  itif(RI)('`get` returns sparse sensor data', async () => {
    const sensorData = await get('get', { sensor: newSensorMac, mode: 'sparse' });
    expect(sensorData.data.data.measurements.length).toBe(3);
    expect(sensorData.data.data.measurements[0].data).toBe(testData1);
    expect(sensorData.data.data.measurements[1].data).toBe(testData2);
    expect(sensorData.data.data.measurements[2].data).toBe(testData3);
  });

  // This might fail if Kinesis processing above is slow
  itif(RI)('`get` returns dense sensor data', async () => {
    const sensorData = await get('get', { sensor: newSensorMac, mode: 'dense' });
    expect(sensorData.data.data.measurements.length).toBe(2);
    expect(sensorData.data.data.measurements[0].data).toBe(testData1);
    expect(sensorData.data.data.measurements[1].data).toBe(testData2);
  });

    // This might fail if Kinesis processing above is slow
  itif(RI)('`get` returns mixed sensor data', async () => {
    const sensorData = await get('get', { sensor: newSensorMac, mode: 'mixed' });
    expect(sensorData.data.data.measurements.length).toBe(3);
    expect(sensorData.data.data.measurements[0].data).toBe(testData1);
    expect(sensorData.data.data.measurements[1].data).toBe(testData2);
    expect(sensorData.data.data.measurements[2].data).toBe(testData3);
  });
});
