const guidHelper = require('../Helpers/guidHelper');
const gatewayHelper = require('../Helpers/gatewayHelper.js');
const emailHelper = require('../Helpers/emailHelper');
const validator = require('../Helpers/validator');
const jwtHelper = require('../Helpers/JWTHelper');
const userHelper = require('../Helpers/userHelper');

exports.handler = async (event, context) => {
    // TODO: This should no longer be required
    if (event.httpMethod === 'OPTIONS') {
        return gatewayHelper.ok();
    }
    const eventBody = JSON.parse(event.body);

    const valid = validator.hasKeys(eventBody, ['email']) && validator.validateEmail(eventBody.email);
    const isReset = eventBody.hasOwnProperty('reset') && eventBody.reset === 1;

    if (!valid) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid e-mail address.');
    }

    const userInfo = {
        email: eventBody.email,
        type: isReset ? 'reset' : 'registration'
    };

    // If not resetting, check for user existing
    if (!isReset && await userHelper.getByEmail(eventBody.email)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "User already exists.");
    }

    try {
        const jwt = jwtHelper.sign(userInfo, process.env.SIGNING_SECRET, process.env.INVITATION_EXPIRATION_INTERVAL * 60);

        let emailResult = {};
        if (userInfo.type === 'registration') {
            emailResult = await emailHelper.sendEmailVerification(userInfo.email, jwt, process.env.SOURCE_EMAIL);
        } else if (userInfo.type === 'reset') {
            emailResult = await emailHelper.sendResetEmail(userInfo.email, jwt, process.env.SOURCE_EMAIL);
        }
        if (!emailResult.hasOwnProperty("MessageId")) {
            throw new Error("Error sending e-mail: " + emailResult);
        }
        console.log(emailResult);
    } catch (e) {
        console.log(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse({
        email: userInfo.email
    });
}
