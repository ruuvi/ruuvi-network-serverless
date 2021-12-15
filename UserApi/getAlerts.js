const errorCodes = require('../Helpers/errorCodes');
const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const alertHelper = require('../Helpers/alertHelper');
const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeGetAlerts, event, context);

const executeGetAlerts = async (event, context, sqlHelper, user) => {
  // Fetch either filtered or full list
  const sensors = [];
  if (event.queryStringParameters && validator.hasKeys(event.queryStringParameters, ['sensor'])) {
    if (!validator.validateMacAddress(event.queryStringParameters.sensor)) {
      return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.', errorCodes.ER_INVALID_FORMAT);
    }
    const isReadable = await sqlHelper.canReadSensor(user.id, event.queryStringParameters.sensor);
    if (!isReadable) {
      return gatewayHelper.forbiddenResponse();
    }
    sensors.push(event.queryStringParameters.sensor);
  } else {
    const sensorData = await sqlHelper.fetchSensorsForUser(user.id);
    sensorData.forEach((data) => {
      sensors.push(data.sensor);
    });
  }

  const result = {
    sensors: []
  };

  for (const sensor of sensors) {
    const alertData = await alertHelper.getAlerts(sensor, user.id);
    const formattedAlertData = [];
    alertData.forEach(function (a) {
      formattedAlertData.push({
        type: a.type,
        min: a.min,
        max: a.max,
        counter: a.counter,
        enabled: a.enabled,
        description: a.description,
        triggered: a.triggered,
        triggeredAt: a.triggeredAt
      });
    });

    result.sensors.push({
      sensor: sensor,
      alerts: formattedAlertData
    });
  }

  return gatewayHelper.successResponse(result);
};
