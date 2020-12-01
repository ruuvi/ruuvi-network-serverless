const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

/**
 * Fetches list of tags the user has shared.
 *
 * @param {object} event
 * @param {object} context
 */
exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const sensors = await mysql.query({
        sql: `SELECT
                sensors.sensor_id AS sensor,
                sensor_profiles.name AS name,
                sensor_profiles.picture AS picture,
                sensors.public AS public,
                users.email AS sharedTo
            FROM sensor_profiles
            INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
            INNER JOIN users ON users.id = sensor_profiles.user_id
            WHERE
                sensors.owner_id = ?
                AND sensor_profiles.is_active = 1
                AND sensor_profiles.user_id != ?`,
        timeout: 1000,
        values: [user.id, user.id]
    });

    // Format returned data properly
    let formatted = [];
    sensors.forEach((sensor) => {
        sensor.public = sensor.public ? true : false;
        formatted.push(sensor);
    });

    return gatewayHelper.successResponse({
        sensors: formatted
    });
}
