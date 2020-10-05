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

    if (!validator.validateAlphaNumeric(sensor)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid sensor ID given.");
    }

    let results = null;

    try {
        const targetUser = await userHelper.getByEmail(targetUserEmail);
        if (!targetUser) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "User not found.");
        }
        const targetUserId = targetUser.id;

        // Currently Enforces sharing restrictions on database level
        results = await mysql.query({
            sql: `INSERT INTO shared_sensors (
                    user_id,
                    sensor_id
                ) SELECT
                    ?,
                    sensor_id
                FROM sensors
                WHERE
                    owner_id = ?
                    AND owner_id != ?
                    AND sensor_id = ?`,
            timeout: 1000,
            values: [targetUserId, user.id, targetUserId, sensor]
        });

        if (results.insertId) {
            // Success
        } else {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Unable to share sensor.");
        }

        // Run clean up function
        await mysql.end();
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "Sensor already shared to user.");
        }

        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse({
        sensor: sensor
    });
}
