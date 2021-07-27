const gatewayHelper = require('../Helpers/gatewayHelper');
const sqlHelper = require('../Helpers/sqlHelper');
const errorCodes = require('../Helpers/errorCodes');

/**
 * Wraps the function to perform connection management in a centralized way.
 * 
 * @param {*} func Function to be executed
 * @param {*} event Lambda event
 * @param {*} context Lambda context
 * @returns 
 */
const wrapper = async (func, event, context) => {
    let result = null;
    try {
        result = await func(event, context, sqlHelper);
    } catch (e) {
        result = gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Very Unknown error occurred.", errorCodes.ER_INTERNAL);
    }

    await sqlHelper.disconnect();
    return result;
}

module.exports = {
    wrapper
};