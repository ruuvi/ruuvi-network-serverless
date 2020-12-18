const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const jwtHelper = require('../Helpers/JWTHelper');
const userHelper = require('../Helpers/userHelper');
const sqlHelper = require('../Helpers/sqlHelper');
const errorCodes = require('../Helpers/errorCodes');

const dateFormat = require( 'dateformat' );

exports.handler = async (event, context) => {
    if (
        !validator.hasKeys(event.queryStringParameters, ['token'])
        || !validator.validateAlphaNumeric(event.queryStringParameters.token)
    ) {
        return gatewayHelper.unauthorizedResponse();
    }

    const short = event.queryStringParameters.token;
    const row = await sqlHelper.fetchSingle('short_token', short, 'reset_tokens');
    if (row === null || row.used_at !== null) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.FORBIDDEN, "Code used or expired.", errorCodes.ER_TOKEN_EXPIRED);
    }

    // Set the code as used
    var current = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    sqlHelper.setValue('used_at', current, 'reset_tokens', 'short_token', short);

    // Validate the long token data
    const token = row.long_token;
    const decrypted = jwtHelper.verify(token, process.env.SIGNING_SECRET);
    if (!decrypted) {
        return gatewayHelper.unauthorizedResponse();
    }
    const email = decrypted.email;
    const type  = decrypted.type;
    const isReset = type === 'reset';

    let userInfo = {
        email: email,
        accessToken: null,
        newUser: isReset ? false : true
    };

    let userId = 0;
    if (!isReset) {
        userId = await userHelper.create(email);
    } else {
        const user = await userHelper.getByEmail(email);
        userId = user.id ? user.id : 0;
    }

    if (userId > 0) {
        userInfo.accessToken = await userHelper.createUserToken(userId);
        if (userInfo.accessToken) {
            console.info("Successfully created token for user: " + userInfo.email);
        }

        if (!isReset) {
            userInfo.subscription = await userHelper.createSubscription(userId);
        }
    } else {
        console.error("Unable to create user " + userInfo.email);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unable to register user.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_NO_USER);
    }

    const deleteResult = await sqlHelper.deleteSingle('short_token', short, 'reset_tokens');
    if (!deleteResult) {
        console.error("Unable to delete `short_token`: " + short);
        console.error(userInfo);
    }

    return gatewayHelper.successResponse(userInfo);
}
