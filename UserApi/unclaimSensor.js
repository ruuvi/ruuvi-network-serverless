const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

/**
 * Unclaims a sensor.
 *
 * @param {object} event
 * @param {object} context
 */
exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor id.", errorCodes.ER_MISSING_ARGUMENT);
    }

    const sensor = eventBody.sensor;

	try {
        // Remove profiles
        const profileResult = await mysql.query({
            sql: `DELETE sensor_profiles
                  FROM sensor_profiles
                  INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                  WHERE
                    sensor_profiles.sensor_id = ?
                    AND sensors.owner_id = ?`,
            timeout: 1000,
            values: [sensor, user.id]
        });

        if (profileResult.affectedRows === 0) {
            console.error(`Error removing sensor profile for sensor ${sensor} for user ${user.id}`);
        } else {
            console.log(`Removed ${profileResult.affectedRows} sensor profiles for sensor ${sensor} by user ${user.id}`);
        }

        // NOTE: We might want to soft-delete this instead
        results = await mysql.query({
            sql: `DELETE FROM sensors
                  WHERE
                    sensor_id = ?
                    AND owner_id = ?`,
            timeout: 1000,
            values: [sensor, user.id]
        });
		if (results.affectedRows !== 1) {
            console.log(`User ${user.id} successfully unclaimed ${sensor}`);
			return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.FORBIDDEN, "Sensor does not belong to user.", errorCodes.ER_FORBIDDEN);
		}
        await mysql.end();
    } catch (e) {
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }

    return gatewayHelper.successResponse();
}
