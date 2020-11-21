const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');

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
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor id.");
    }

    const sensor = eventBody.sensor;

	try {
        // Remove profiles
        await mysql.query({
            sql: `DELETE sensor_profiles
                  FROM sensor_profiles
                  INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                  WHERE
                    sensor_profiles.sensor_id = ?
                    AND sensors.owner_id = ?
                    AND sensors.sensor_id = ?`,
            timeout: 1000,
            values: [sensor, user.id, user.id, sensor]
        });

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
			return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Sensor does not belong to user.");
		}
        await mysql.end();
    } catch (e) {
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse();
}
