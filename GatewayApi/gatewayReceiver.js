const AWS = require('aws-sdk');
const gatewayHelper = require('../Helpers/gatewayHelper.js');
const throttleHelper = require('../Helpers/throttleHelper');
const alertHelper = require('../Helpers/alertHelper');
const sensorDataHelper = require('../Helpers/sensorDataHelper');
const validator = require('../Helpers/validator');
const gatewayWrapper = require('../Helpers/wrapper').gatewayWrapper;

AWS.config.update({ region: 'eu-central-1' });
const kinesis = new AWS.Kinesis({ apiVersion: '2013-12-02' });
const MAX_UPLOAD_DELAY = 30 * 24 * 60 * 60 * 1000; // 1 month
const STATUS_SUCCESS = 0;
const STATUS_ERROR = 1;
const STATUS_EXCEPTION = 2;

/**
 * Sends received data to Kinesis Stream for processing
 */
exports.handler = async (event, context) => gatewayWrapper(receiveData, event, context, true);

/**
 * Validates that data in eventBody.data has all the required fields and is not too old.
 * @return true if data is valid and should be processed.
 */
const validateInput = function (data) {
  return (validator.validateAll(data, [
    { name: 'tags', type: 'ARRAY', required: true },
    { name: 'gw_mac', type: 'MAC', required: true },
    { name: 'timestamp', type: 'INT', required: true },
    { name: 'coordinates', type: 'STRING', required: true }
  ]) &&
  ((parseInt(data.timestamp) * 1000) > (Date.now() - MAX_UPLOAD_DELAY)));
};

/**
 * Processes alerts for given keys in given tags in data.tags.
 * @return 0 if processing was successful, 1 if exception occurred.
 * @note Unknown dataformats are discarded, but return 0.
 */
const processAlerts = async (key, data) => {
  let status = STATUS_SUCCESS;
  try {
    const alerts = await alertHelper.getAlerts(key, null, true);
    if (alerts.length > 0) {
      const alertData = sensorDataHelper.parseData(data.tags[key].data);
      if (alertData === null) {
        // No action needed, unknown / unofficial dataformat.
      } else {
        alertData.sensor_id = key;
        alertData.signal = data.tags[key].rssi; // Not a part of the data payload

        await alertHelper.processAlerts(alerts, alertData);
      }
    }
  } catch (e) {
    console.error('Error in alert processing ' + JSON.stringify(e));
    status = STATUS_EXCEPTION;
  }
  return status;
};

/**
 * Send processed data to Kinesis for storing todatabase.
 * @return 0 on success, 1 on Kinesis error, 2 on exception.
 *
 */

const sendToKinesis = async (unthrottledTags, data, tagIds) => {
  let kinesisStatus = STATUS_SUCCESS;
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
    const res = await kinesis.putRecord(params).promise();

    if (!res.ShardId || !res.SequenceNumber) {
      console.error(res);
      kinesisStatus = STATUS_ERROR;
    }
  } catch (e) {
    kinesisStatus = STATUS_EXCEPTION;
    console.error(`Write exception for ${data.gw_mac}`, e);
  }
  return kinesisStatus;
};

const receiveData = async (event, context) => {
  const eventBody = JSON.parse(event.body);
  const data = eventBody.data;

  if (parseInt(process.env.DEBUG_MODE) === 1) {
    console.debug(eventBody);
  }

  if (!validateInput(data)) {
    return gatewayHelper.invalid();
  }

  const throttleGW = await throttleHelper.throttle('gw_' + data.gw_mac, process.env.GATEWAY_THROTTLE_INTERVAL);

  if (throttleGW) {
    return gatewayHelper.throttledResponse();
  }

  // Process per Tag Throttling + Parse Tags from data
  const unthrottledTags = {};
  const tagIds = [];
  let alertStatus = STATUS_SUCCESS;
  for (const key in data.tags) {
    // Process alerts first to alert if necessary, even if throttled
    const runStatus = await processAlerts(key, data);
    if (runStatus !== STATUS_SUCCESS) {
      alertStatus = runStatus;
    }

    // Process throttling
    const throttleSensor = await throttleHelper.throttle(`sensor_${key}`, parseInt(process.env.MINIMUM_SENSOR_THROTTLE_INTERVAL) - 5);
    if (throttleSensor) {
      continue;
    }

    unthrottledTags[key] = data.tags[key];
    if (Object.prototype.hasOwnProperty.call(data.tags, key)) {
      tagIds.push(key);
    }
  }

  if (alertStatus !== STATUS_SUCCESS) {
    console.error('Exception in processing alerts');
    return gatewayHelper.invalid();
  }

  const kinesisStatus = await sendToKinesis(unthrottledTags, data, tagIds);
  if (kinesisStatus !== STATUS_SUCCESS) {
    console.error(`Error in Kinesis. Data ${data}, tagIds ${tagIds}, unthrottledTags ${unthrottledTags}`);
    return gatewayHelper.internal();
  }

  // Include the gateway request rate by default
  return gatewayHelper.ok(null, {
    [gatewayHelper.RequestRateHeader]: process.env.GATEWAY_SEND_RATE
  });
};
