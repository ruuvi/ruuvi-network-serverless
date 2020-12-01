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

        if (user.id !== targetUserId) {
            // NOTE: We might want to change this into soft-delete
            // Remove sensor share from user to target user
            results = await mysql.query({
                sql: `DELETE sensor_profiles
                    FROM sensor_profiles
                    INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                    WHERE
                        sensor_profiles.user_id = ?
                        AND sensor_profiles.is_active = 1
                        AND sensors.owner_id = ?
                        AND sensors.owner_id != ?
                        AND sensors.sensor_id = ?`,
                timeout: 1000,
                values: [targetUserId, user.id, targetUserId, sensor]
            });
        } else {
            // NOTE: We might want to change this into soft-delete (see reference implementation below)
            results = await mysql.query({
                sql: `DELETE sensor_profiles
                    FROM sensor_profiles
                    INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                    WHERE
                        sensor_profiles.user_id = ?
                        AND sensor_profiles.is_active = 1
                        AND sensors.owner_id != ?
                        AND sensors.sensor_id = ?`,
                timeout: 1000,
                values: [user.id, user.id, sensor]
            });

            /* WORKING SOFT-DELETE IMPLEMENTATION
            // Remove sensor share from any user to you by setting the `is_active` to false
            results = await mysql.query({
                sql: `UPDATE sensor_profiles
                    INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                    SET sensor_profiles.is_active = 0
                    WHERE
                        sensor_profiles.user_id = ?
                        AND sensor_profiles.is_active = 1
                        AND sensors.owner_id != ?
                        AND sensors.sensor_id = ?`,
                timeout: 1000,
                values: [user.id, user.id, sensor]
            });
            */
        }

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
