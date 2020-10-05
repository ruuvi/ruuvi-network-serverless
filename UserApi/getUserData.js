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
                sensor_id AS sensor,
                true AS owner,
                picture AS picture
            FROM sensors
            WHERE owner_id = ?
            UNION
            SELECT
                sensor_id AS sensor,
                false AS owner,
                '' AS picture
            FROM shared_sensors
            WHERE user_id = ?`,
        timeout: 1000,
        values: [user.id, user.id]
    });

    return gatewayHelper.successResponse({
        email: user.email,
        sensors: sensors
    });
}
