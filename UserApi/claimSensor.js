const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes');
const emailHelper = require('../Helpers/emailHelper');
const wrapper = require('../Helpers/wrapper').wrapper;

exports.handler = async (event, context) => wrapper(executeClaim, event, context);

const executeClaim = async (event, context, sqlHelper) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor']) || !validator.validateMacAddress(eventBody.sensor)) {
        console.log("Invalid Sensor: " + eventBody.sensor);
        return gatewayHelper.errorResponse(HTTPCodes.INVALID, "Missing or invalid sensor given", errorCodes.ER_MISSING_ARGUMENT);
    }

    // Check Subscription
    const subscription = await sqlHelper.fetchSingle('user_id', user.id, 'subscriptions');
    if (!subscription) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'No subscription found.', errorCodes.ER_SUBSCRIPTION_NOT_FOUND);
    }
    const maxClaims = parseInt(subscription.max_claims);
    const currentClaims = await sqlHelper.fetchCount('owner_id', user.id, 'sensors');
    if (currentClaims < 0) {
        console.error('Current claims under 0');
        return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }

    if (currentClaims >= maxClaims) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Maximum claims for subscription reached.', errorCodes.ER_CLAIM_COUNT_REACHED);
    }

    const sensor = eventBody.sensor;

    const sensorName = validator.hasKeys(eventBody, ['name']) ? eventBody.name : '';
    const description = validator.hasKeys(eventBody, ['description']) ? eventBody.name : '';

    const results = await sqlHelper.insertSingle({
        'owner_id': user.id,
        'sensor_id': sensor,
        'description': description || ''
    }, 'sensors');

    if (!results) {
        return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL);
    } else if (results.code) {
        if (results.code === 'ER_DUP_ENTRY') {
            const claimerRes = await sqlHelper.fetchSingle('sensor_id', sensor, 'sensors');
            const claimerUserRes = await sqlHelper.fetchSingle('id', claimerRes.owner_id, 'users');
            const maskedEmail = emailHelper.maskEmail(claimerUserRes.email);

            return gatewayHelper.errorResponse(HTTPCodes.CONFLICT, `Sensor already claimed by ${maskedEmail}.`, errorCodes.ER_SENSOR_ALREADY_CLAIMED);
        } else {
            console.error('Error inserting sensor', results);
            return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
        }
    }

    const profileResults = sqlHelper.insertSingle({
        user_id: user.id,
        sensor_id: sensor,
        name: sensorName,
        picture: ''
    }, 'sensor_profiles');

    if (!profileResults || profileResults.code) {
        console.error('Error inserting sensor_profile', profileResults);
        
        return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }

    // Run clean up function
    return gatewayHelper.successResponse({
        sensor: sensor
    });
}
