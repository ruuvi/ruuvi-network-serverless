const gatewayHelper = require('../Helpers/gatewayHelper.js');
const emailHelper = require('../Helpers/emailHelper');
const validator = require('../Helpers/validator');
const jwtHelper = require('../Helpers/JWTHelper');
const userHelper = require('../Helpers/userHelper');
const errorCodes = require('../Helpers/errorCodes');

const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeRequestRegistration, event, context, false);

const executeRequestRegistration = async (event, context, sqlHelper) => {
    // TODO: This should no longer be required
    if (event.httpMethod === 'OPTIONS') {
        return gatewayHelper.ok();
    }
    const eventBody = JSON.parse(event.body);

    const valid = validator.hasKeys(eventBody, ['email']) && validator.validateEmail(eventBody.email);

    if (!valid) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid e-mail address.', errorCodes.ER_INVALID_EMAIL_ADDRESS);
    }

    const existingUser = await userHelper.getByEmail(eventBody.email);
    const isReset = existingUser ? true : false;

    const userInfo = {
        email: eventBody.email,
        type: isReset ? 'reset' : 'registration'
    };

    try {
        const short = await jwtHelper.createRegistrationJWT(userInfo.email, userInfo.type);
        if (!short) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Unknown error occurred.', errorCodes.INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
        }

        // Internal override to skip e-mail verification
        if (gatewayHelper.getHeader('X-Internal-Secret', event.headers) === process.env.INTERNAL_API_KEY) {
            return gatewayHelper.successResponse({
                email: userInfo.email,
                token: short
            });
        }

        let emailResult = {};
        if (userInfo.type === 'registration') {
            emailResult = await emailHelper.sendEmailVerification(userInfo.email, short, process.env.SOURCE_DOMAIN);
        } else if (userInfo.type === 'reset') {
            emailResult = await emailHelper.sendResetEmail(userInfo.email, short, process.env.SOURCE_DOMAIN);
        }
        if (!emailResult.hasOwnProperty("MessageId")) {
            throw new Error("Error sending e-mail: " + emailResult);
        }
        console.log(emailResult);
    } catch (e) {
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL);
    }

    return gatewayHelper.successResponse({
        email: userInfo.email
    });
}
