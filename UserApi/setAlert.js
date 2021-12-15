const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const alertHelper = require('../Helpers/alertHelper');
const errorCodes = require('../Helpers/errorCodes.js');
const dynamoHelper = require('../Helpers/dynamoHelper');
const sensorDataHelper = require('../Helpers/sensorDataHelper');
const throttleHelper = require('../Helpers/throttleHelper');

const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeSetAlert, event, context);

const executeSetAlert = async (event, context, sqlHelper, user) => {
  const eventBody = JSON.parse(event.body);

  if (!eventBody || !validator.hasKeys(eventBody, ['sensor', 'type', 'enabled'])) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Missing setting sensor, type or enabled.', errorCodes.ER_MISSING_ARGUMENT);
  }

  if (!validator.validateMacAddress(eventBody.sensor)) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.', errorCodes.ER_INVALID_FORMAT);
  }

  if (!validator.validateEnum(eventBody.type, ['temperature', 'humidity', 'pressure', 'signal', 'movement'])) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid type: ' + eventBody.type, errorCodes.ER_INVALID_ENUM_VALUE);
  }

  if (eventBody.type !== 'movement' && !validator.hasKeys(eventBody, ['min', 'max'])) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Missing setting min or max argument.', errorCodes.ER_MISSING_ARGUMENT);
  }

  let counter = 0;
  if (eventBody.type === 'movement') {
    counter = parseInt(eventBody.counter);
    if (!validator.hasKeys(eventBody, ['counter'])) {
      const lastDataPoint = await dynamoHelper.getSensorData(eventBody.sensor, 1, null, null);
      if (lastDataPoint.length > 0) {
        const lastDataParsed = sensorDataHelper.parseData(lastDataPoint[0].SensorData);
        counter = lastDataParsed.movementCounter ? parseInt(lastDataParsed.movementCounter) : 0;
      }
    }
  }

  const sensor = eventBody.sensor;

  const isReadable = await sqlHelper.canReadSensor(user.id, sensor);
  if (!isReadable) {
    return gatewayHelper.forbiddenResponse();
  }

  const type = eventBody.type;
  const enabled = !!((eventBody.enabled === true || eventBody.enabled === 'true'));
  const min = validator.hasKeys(eventBody, ['min']) ? parseFloat(eventBody.min) : Number.MIN_VALUE;
  const max = validator.hasKeys(eventBody, ['max']) ? parseFloat(eventBody.max) : Number.MAX_VALUE;
  const description = validator.hasKeys(eventBody, ['description']) ? eventBody.description : '';

  let res = 'success';
  try {
    await alertHelper.putAlert(user.id, sensor, type, min, max, counter, enabled, description);

    // Clear Throttle
    const throttleKey = `alert:${user.id}:${sensor}:${type}`;
    const throttleInterval = process.env.ALERT_THROTTLE_INTERVAL ? process.env.ALERT_THROTTLE_INTERVAL : throttleHelper.defaultIntervals.alert;
    await throttleHelper.clearThrottle(throttleKey, throttleInterval);
  } catch (e) {
    console.error(e);
    res = 'failed';
  }

  return gatewayHelper.successResponse({
    action: res
  });
};
