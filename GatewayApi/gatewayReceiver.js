const AWS = require('aws-sdk');
const gatewayHelper = require('../Helpers/gatewayHelper.js');
const throttleHelper = require('../Helpers/throttleHelper');
const alertHelper = require('../Helpers/alertHelper');
const sensorDataHelper = require('../Helpers/sensorDataHelper');
const validator = require('../Helpers/validator');
const gatewayWrapper = require('../Helpers/wrapper').gatewayWrapper;

AWS.config.update({ region: 'eu-central-1' });
const kinesis = new AWS.Kinesis({ apiVersion: '2013-12-02' });

/**
 * Sends received data to Kinesis Stream for processing
 */
exports.handler = async (event, context) => gatewayWrapper(receiveData, event, context, true);

const receiveData = async (event, context) => {
  const eventBody = JSON.parse(event.body);
  const data = eventBody.data;

  if (parseInt(process.env.DEBUG_MODE) === 1) {
    console.info(eventBody);
  }

  // TODO: This validation is pretty rudimentary
  const MAX_UPLOAD_DELAY = 30 * 24 * 60 * 60 * 1000; // 1 month

  if (
    !validator.validateAll(data, [
      { name: 'tags', type: 'ARRAY', required: true },
      { name: 'gw_mac', type: 'MAC', required: true },
      { name: 'timestamp', type: 'INT', required: true },
      { name: 'coordinates', type: 'STRING', required: true }
    ]) ||
        (parseInt(data.timestamp) * 1000) < Date.now() - MAX_UPLOAD_DELAY // Cap history upload
  ) {
    return gatewayHelper.invalid();
  }

  const throttleGW = await throttleHelper.throttle('gw_' + data.gw_mac, process.env.GATEWAY_THROTTLE_INTERVAL);

  if (throttleGW) {
    return gatewayHelper.throttledResponse();
  }

  // Process per Tag Throttling + Parse Tags from data
  const unthrottledTags = {};
  const tagIds = [];
  for (const key in data.tags) {
    // Process alerts first to alert if necessary, even if throttled
    const alerts = await alertHelper.getAlerts(key, null, true);
    if (alerts.length > 0) {
      const alertData = sensorDataHelper.parseData(data.tags[key].data);
      if (alertData === null) {
        console.error('Invalid data received: ' + data.tags[key].data);
      } else {
        alertData.sensor_id = key;
        alertData.signal = data.tags[key].rssi; // Not a part of the data payload

        await alertHelper.processAlerts(alerts, alertData);
      }
    }

    // Process throttling
    const throttleSensor = await throttleHelper.throttle(`sensor_${key}`, parseInt(process.env.MINIMUM_SENSOR_THROTTLE_INTERVAL) - 5);
    if (throttleSensor) {
      continue;
    }

    unthrottledTags[key] = data.tags[key];
    // https://eslint.org/docs/rules/no-prototype-builtins
    if (Object.prototype.hasOwnProperty.call(data.tags, key)) {
      tagIds.push(key);
    }
  }

  try {
    // Sensor data format
    const dataPacket = {
      data: unthrottledTags,
      meta: {
        gwmac: data.gw_mac,
        timestamp: '' + data.timestamp,
        coordinates: data.coordinates === '' ? 'N/A' : data.coordinates,
        tags: JSON.stringify(tagIds)
      }
    };

    // Kinesis params
    const params = {
      Data: JSON.stringify(dataPacket),
      PartitionKey: data.gw_mac,
      StreamName: process.env.STREAM_NAME
    };

    async function sendUpdate (params) {
      return kinesis.putRecord(params).promise();
    }

    const res = await sendUpdate(params);

    if (!res.ShardId || !res.SequenceNumber) {
      console.error(res);
      return gatewayHelper.invalid();
    }
  } catch (e) {
    console.error(`Write exception for ${data.gw_mac}`, e);
    return gatewayHelper.invalid();
  }

  // Include the gateway request rate by default
  return gatewayHelper.ok(null, {
    [gatewayHelper.RequestRateHeader]: process.env.GATEWAY_SEND_RATE
  });
};
