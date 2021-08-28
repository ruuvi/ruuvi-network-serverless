const gatewayHelper = require('../Helpers/gatewayHelper');
const sqlHelper = require('../Helpers/sqlHelper');
const errorCodes = require('../Helpers/errorCodes');
const auth = require('../Helpers/authHelper');

/**
 * Wraps the function to perform connection management in a centralized way.
 * 
 * @param {*} func Function to be executed
 * @param {*} event Lambda event
 * @param {*} context Lambda context
 * @returns 
 */
const wrapper = async (func, event, context, requireAuth = true) => {
    // Auth
    let user = null;
    if (requireAuth) {
        user = await auth.authorizedUser(event.headers);
        if (!user) {
            await sqlHelper.disconnect();
            return gatewayHelper.unauthorizedResponse();
        }
    }

    let result = null;
    try {
        result = await func(event, context, sqlHelper, user);
    } catch (e) {
        console.error('Unknown error in handler', e);
        result = gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Very Unknown error occurred.", errorCodes.ER_INTERNAL);
    }

    await sqlHelper.disconnect();
    return result;
}

module.exports = {
    wrapper
};