const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const alertHelper = require('../Helpers/alertHelper');
const errorCodes = require('../Helpers/errorCodes.js');
const mysqlHelper = require('../Helpers/sqlHelper');

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor', 'type', 'min', 'max', 'enabled'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing setting sensor, type, enabled, min or max.", errorCodes.ER_MISSING_ARGUMENT);
    }

    if (!validator.validateEnum(eventBody.type, ['temperature', 'humidity', 'pressure', 'signal', 'movement'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid type: " + eventBody.type, errorCodes.ER_INVALID_ENUM_VALUE);
    }

    const sensor = eventBody.sensor;
    const type = eventBody.type;
    const enabled = (eventBody.enabled === true || eventBody.enabled === 'true') ? true : false;
    const min = parseFloat(eventBody.min);
    const max = parseFloat(eventBody.max);

    let res = 'success'; 
    let putResult = null;
    try {
        putResult = await alertHelper.putAlert(user.id, sensor, type, min, max, enabled);
    } catch (e) {
        console.error(e);
        res = 'failed';
    }

    await mysqlHelper.disconnect();
    
    return gatewayHelper.successResponse({
        action: res
    });
}
