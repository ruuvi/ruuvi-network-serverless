const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const alertHelper = require('../Helpers/alertHelper');
const sqlHelper = require('../Helpers/sqlHelper');

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    // Fetch either filtered or full list
    let sensors = [];
    if (event.queryStringParameters && validator.hasKeys(event.queryStringParameters, ['sensor'])) {
        if (!validator.validateMacAddress(event.queryStringParameters.sensor)) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.', errorCodes.ER_INVALID_FORMAT);
        }
        if (!sqlHelper.canReadSensor(user.id, event.queryStringParameters.sensor)) {
            return gatewayHelper.forbiddenResponse();
        }
        sensors.push(event.queryStringParameters.sensor);
    } else {
        const sensorData = await sqlHelper.fetchSensorsForUser(user.id);
        sensorData.forEach((data) => {
            sensors.push(data.sensor);
        });
    }

    let result = {
        sensors: []
    };

    for (const sensor of sensors) {
        const alertData = await alertHelper.getAlerts(sensor, user.id);
        let formattedAlertData = [];
        alertData.forEach(function(a) {
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
    };

    await sqlHelper.disconnect();

    return gatewayHelper.successResponse(result);
}
