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

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor']) || !validator.validateMacAddress(eventBody.sensor)) {
        console.log("Invalid Sensor: " + eventBody.sensor);
        return gatewayHelper.errorResponse(HTTPCodes.INVALID, "Missing or invalid sensor given");
    }

    const sensor = eventBody.sensor;

    let results = null;
    let sensorName = validator.hasKeys(eventBody, ['name']) ? eventBody.name : '';

    try {
        results = await mysql.query({
            sql: `INSERT INTO sensors (
                    owner_id,
                    sensor_id
                ) VALUES (
                    ?,
                    ?
                );`,
            timeout: 1000,
            values: [user.id, sensor]
        });

        if (results.insertId) {
            // Success
        }

        const profileResults = await mysql.query({
            sql: `INSERT INTO sensor_profiles (
                    user_id,
                    sensor_id,
                    name,
                    picture
                ) VALUES (
                    ?,
                    ?,
                    ?,
                    ''
                );`,
            timeout: 1000,
            values: [user.id, sensor, sensorName]
        });

        if (profileResults.insertId) {
            // Success
        }

        // Run clean up function
        await mysql.end();
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(HTTPCodes.CONFLICT, "Sensor already claimed.");
        }
        console.error(e);
        return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse({
        sensor: sensor
    });
}
