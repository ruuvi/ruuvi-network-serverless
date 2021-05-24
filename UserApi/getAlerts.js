const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes.js');
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
        sensors.push(event.queryStringParameters.sensor);
    } else {
        const sensorData = await sqlHelper.fetchSensorsForUser(user.id);
        sensorData.forEach((data) => {
            sensors.push(data.sensor);
        });
    }

    let sensorAlerts = {};
    for (const sensor of sensors) {
        const alertData = await alertHelper.getAlerts(sensor, user.id);
        sensorAlerts[sensor] = alertData;
    };

    await sqlHelper.disconnect();

    return gatewayHelper.successResponse(sensorAlerts);
}
