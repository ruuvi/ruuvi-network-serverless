const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes.js');
const alertHelper = require('../Helpers/alertHelper');

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
    const alertData = await alertHelper.getAlerts(sensor);
    console.log(sensor);
    console.log(alertData);
    return gatewayHelper.successResponse({
        alerts: alertData
    });
}
