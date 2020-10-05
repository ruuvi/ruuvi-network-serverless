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

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor'])) {
        return gatewayHelper.errorResponse(HTTPCodes.INVALID, "Missing sensor");
    }

    const sensor = eventBody.sensor;

    let results = null;
    let sensorName = validator.hasKeys(eventBody, ['name']) ? eventBody.name : '';

    try {
        results = await mysql.query({
            sql: `INSERT INTO sensors (
                    owner_id,
                    sensor_id,
                    name
                ) VALUES (
                    ?,
                    ?,
                    ?
                );`,
            timeout: 1000,
            values: [user.id, sensor, sensorName]
        });

        if (results.insertId) {
            // Success
        }

        // Run clean up function
        await mysql.end();
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(HTTPCodes.CONFLICT, "Sensor already claimed.");
        }

        return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse({
        sensor: sensor
    });
}
