const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const userHelper = require('../Helpers/userHelper')

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor', 'user'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor or e-mail.");
    }

    const sensor = eventBody.sensor;
    const targetUserEmail = eventBody.user;

    if (!validator.validateEmail(targetUserEmail)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid E-mail given.");
    }

    if (!validator.validateMacAddress(sensor)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid sensor ID given.");
    }

    let results = null;

    try {
        const targetUser = await userHelper.getByEmail(targetUserEmail);
        if (!targetUser) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "User not found.");
        }
        const targetUserId = targetUser.id;

        // NOTE: We might want to change this into soft-delete
        results = await mysql.query({
            sql: `DELETE shared_sensors
                  FROM shared_sensors
                  INNER JOIN sensors ON sensors.sensor_id = shared_sensors.sensor_id
                  WHERE
                    shared_sensors.user_id = ?
                    AND sensors.owner_id = ?
                    AND sensors.owner_id != ?
                    AND sensors.sensor_id = ?`,
            timeout: 1000,
            values: [targetUserId, user.id, targetUserId, sensor]
        });

        if (results.affectedRows === 1) {
            // Success
            console.log(`User ${user.id} unshared sensor ${sensor} from ${targetUserId}`);
        } else {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Unable to unshare sensor.");
        }

        // Run clean up function
        await mysql.end();
    } catch (e) {
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse();
}
