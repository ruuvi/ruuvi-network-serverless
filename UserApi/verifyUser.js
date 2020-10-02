const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const guidHelper = require('../Helpers/guidHelper');
const jwtHelper = require('../Helpers/JWTHelper');
const userHelper = require('../Helpers/userHelper');

exports.handler = async (event, context) => {
    if (
        !validator.hasKeys(event.queryStringParameters, ['token'])
        || !validator.validateToken(event.queryStringParameters.token)
    ) {
        return gatewayHelper.unauthorizedResponse();
    }

    const token = event.queryStringParameters.token;
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
        userInfo.accessToken = await userHelper.createToken(userId);
        if (userInfo.accessToken) {
            console.info("Successfully created token for user: " + userInfo.email);
        }
    } else {
        console.error("Unable to create user " + userInfo.email);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unable to register user.");
    }

    return gatewayHelper.successResponse(userInfo);
}
