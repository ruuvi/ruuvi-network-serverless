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
                sensors.name AS name,
                true AS owner,
                sensors.picture AS picture,
                sensors.public AS public
            FROM sensors
            WHERE sensors.owner_id = ?
            UNION
            SELECT
                sensors.sensor_id AS sensor,
                sensors.name AS name,
                false AS owner,
                sensors.picture AS picture,
                sensors.public AS public
            FROM shared_sensors
            INNER JOIN sensors ON sensors.sensor_id = shared_sensors.sensor_id
            WHERE shared_sensors.user_id = ?`,
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
