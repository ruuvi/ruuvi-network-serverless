const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const alertHelper = require('../Helpers/alertHelper');
const errorCodes = require('../Helpers/errorCodes.js');
const redis = require('../Helpers/redisHelper').getClient();

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor', 'type', 'min', 'max', 'enabled'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing setting type, enabled, min or max.", errorCodes.ER_MISSING_ARGUMENT);
    }

    if (!validator.validateEnum(eventBody.type, ['temperature', 'humidity', 'pressure', 'signal', 'movement'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid type: " + eventBody.type, errorCodes.ER_INVALID_ENUM_VALUE);
    }

    const sensor = eventBody.sensor;
    const type = eventBody.type;
    const enabled = eventBody.enabled;
    const min = eventBody.min;
    const max = eventBody.max;

    let res = 'success'; 
    let putResult = null;
    try {
        putResult = await alertHelper.putAlert(user.id, sensor, type, min, max, enabled);
    } catch (e) {
        console.error(e);
        res = 'failed';
    }

    return gatewayHelper.successResponse({
        action: res,
        tempResponse: putResult
    });
}
