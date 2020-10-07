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
                sensors.name AS name,
                sensors.picture AS picture,
                sensors.public AS public,
                users.email AS shared_to
            FROM shared_sensors
            INNER JOIN sensors ON sensors.sensor_id = shared_sensors.sensor_id
            INNER JOIN users ON users.id = shared_sensors.user_id
            WHERE
                sensors.owner_id = ?`,
        timeout: 1000,
        values: [user.id]
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
