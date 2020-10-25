const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const userHelper = require('../Helpers/userHelper');
const emailHelper = require('../Helpers/emailHelper');
const sqlHelper = require('../Helpers/sqlHelper');

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

    if (!validator.validateMacAddress(sensor)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid sensor ID given.");
    }
    
    let results = null;

    try {
        const targetUser = await userHelper.getByEmail(targetUserEmail);
        if (!targetUser) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "User not found.");
        }

        // Get Subscription
        const subscription = await sqlHelper.fetchSingle('user_id', user.id, 'subscriptions');
        if (!subscription) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'No subscription found.');
        }
        const maxShares = parseInt(subscription.max_shares);

        const currentShares = await mysql.query({
            sql: `SELECT COUNT(*) AS sensor_count
                FROM shared_sensors
                INNER JOIN sensors ON sensors.sensor_id = shared_sensors.sensor_id
                INNER JOIN users ON users.id = shared_sensors.user_id
                WHERE
                    sensors.owner_id = ?`,
            timeout: 1000,
            values: [user.id]
        });
    
        if (currentShares[0].sensor_count >= maxShares) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Maximum share count reached.');
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

    // Sharing was successful, send notification e-mail
    try {
        const sensorData = await sqlHelper.fetchSingle('sensor_id', sensor, 'sensors');
        emailHelper.sendShareNotification(
            targetUserEmail,
            sensorData.name,
            user.email,
            process.env.SOURCE_EMAIL,
            process.env.SOURCE_DOMAIN
        );
    } catch (e) {
        console.error(e.message);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Share successful. Failed to send notification.");
    }

    return gatewayHelper.successResponse({
        sensor: sensor
    });
}
