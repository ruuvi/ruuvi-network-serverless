const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const dynamoHelper = require('../Helpers/dynamoHelper');
const errorCodes = require('../Helpers/errorCodes.js');

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    if (!event.queryStringParameters || !validator.hasKeys(event.queryStringParameters, ['sensor'])) {
        console.error(event);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor.", errorCodes.ER_MISSING_ARGUMENT);
    }

    const sensor = event.queryStringParameters.sensor;
    const alerts = await dynamoHelper.getAlerts(sensor);

    let formatted = [];
    alerts.forEach((alert) => {
        formatted.push({
            'type': alert.AlertType,
            'min': alert.MinValue,
            'max': alert.MaxValue,
            'enabled': alert.Enabled
        });
    });

    return gatewayHelper.successResponse({
        alerts: formatted
    });
}
