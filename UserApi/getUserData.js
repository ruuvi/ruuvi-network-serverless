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

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const sensors = await mysql.query({
        sql: `SELECT
                sensors.sensor_id AS sensor,
                COALESCE(sensor_profiles.name, '') AS name,
                true AS owner,
                COALESCE(sensor_profiles.picture, '') AS picture,
                sensors.public AS public
            FROM sensors
            INNER JOIN sensor_profiles ON
                sensor_profiles.sensor_id = sensors.sensor_id
                AND sensor_profiles.user_id = sensors.owner_id
            WHERE sensors.owner_id = ?
            UNION
            SELECT
                sensors.sensor_id AS sensor,
                COALESCE(sensor_profiles.name, '') AS name,
                false AS owner,
                COALESCE(sensor_profiles.picture, '') AS picture,
                sensors.public AS public
            FROM sensor_profiles
            INNER JOIN sensors ON sensor_profiles.sensor_id = sensors.sensor_id
            WHERE
                sensor_profiles.user_id = ?
                AND sensor_profiles.is_active = 1`,
        timeout: 1000,
        values: [user.id, user.id]
    });

    // Format returned data properly
    let formatted = [];
    sensors.forEach((sensor) => {
        sensor.public = sensor.public ? true : false;
        sensor.owner = sensor.owner ? true : false;
        formatted.push(sensor);
    });

    return gatewayHelper.successResponse({
        email: user.email,
        sensors: formatted
    });
}
