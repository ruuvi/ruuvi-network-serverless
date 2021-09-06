const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const userHelper = require('../Helpers/userHelper');
const emailHelper = require('../Helpers/emailHelper');
const dynamoHelper = require('../Helpers/dynamoHelper');
const errorCodes = require('../Helpers/errorCodes');

const wrapper = require('../Helpers/wrapper').wrapper;

exports.handler = async (event, context) => wrapper(executeShare, event, context);

const getSensorName = async (sensor, sqlHelper) => {
    let sensorName = null;
    try {
        const sensorData = await sqlHelper.query({
            sql: `SELECT name
                FROM sensor_profiles
                INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                WHERE
                    sensors.owner_id = sensor_profiles.user_id
                    AND sensor_profiles.is_active = 1
                    AND sensor_profiles.sensor_id = ?`,
            timeout: 1000,
            values: [sensor]
        });

        if (sensorData.length === 0) {
            console.error(`Sensor profile not found for owner for ${sensor}`);
            return null;
        }

        sensorName = (sensorData[0].name !== null && sensorData[0].name !== '')
            ? sensorData[0].name
            : emailHelper.getDefaultSensorName(sensor);
    } catch (e) {
        console.error(`Failed to fetch name for sensor ${sensor}`);
    } finally {
        return sensorName;
    }
}

const executeShare = async (event, context, sqlHelper, user) => {
    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor', 'user'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor or e-mail.", errorCodes.ER_MISSING_ARGUMENT);
    }

    const sensor = eventBody.sensor;
    const targetUserEmail = eventBody.user;

    if (!validator.validateEmail(targetUserEmail)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid E-mail given.", errorCodes.ER_INVALID_EMAIL_ADDRESS);
    }

    if (!validator.validateMacAddress(sensor)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid sensor ID given.", errorCodes.ER_INVALID_MAC_ADDRESS);
    }

    let targetUser = null;
    let targetUserId = null;

    try {
        // Get Subscription
        const subscription = await sqlHelper.fetchSingle('user_id', user.id, 'subscriptions');
        if (!subscription) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'No subscription found.', errorCodes.ER_SUBSCRIPTION_NOT_FOUND);
        }
        const maxShares = parseInt(subscription.max_shares);
        const maxSharesPerSensor = parseInt(subscription.max_shares_per_sensor);

        const currentShares = await sqlHelper.query({
            sql: `SELECT
                    COUNT(*) AS sensor_count,
                    SUM(IF(sensors.sensor_id = ?, 1, 0)) AS single_sensor_shares
                FROM sensor_profiles
                INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                INNER JOIN users ON users.id = sensor_profiles.user_id
                WHERE
                    sensors.owner_id = ?
                    AND sensor_profiles.user_id != ?`,
            timeout: 1000,
            values: [sensor, user.id, user.id]
        });

        if (currentShares[0].sensor_count >= maxShares) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Maximum share count for subscription reached.', errorCodes.ER_SHARE_COUNT_REACHED);
        }

        if (currentShares[0].single_sensor_shares >= maxSharesPerSensor) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, `Maximum share (${maxSharesPerSensor}) count reached for sensor ${sensor}.`, errorCodes.ER_SENSOR_SHARE_COUNT_REACHED);
        }

        const data = await dynamoHelper.getSensorData(sensor, 1, null, null);
        if (data.length === 0) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Cannot share a sensor without data.', errorCodes.ER_NO_DATA_TO_SHARE);
        }

        // Validated that sharing is possible, check if user needs to be invited.
        targetUser = await userHelper.getByEmail(targetUserEmail);
        if (!targetUser) {
            await sqlHelper.createPendingShare(sensor, targetUserEmail, user.id);
            
            const ownerSensorName = await getSensorName(sensor, sqlHelper);
            if (ownerSensorName === null) {
                console.log(`Sensor profile not found for owner for ${sensor}`);
                return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Share successful, but unable to send e-mail.', errorCodes.ER_UNABLE_TO_SEND_EMAIL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
            }
    
            await userHelper.sendInvitation(targetUserEmail, user.email, ownerSensorName);
            return gatewayHelper.successResponse({
                sensor: sensor,
                invited: true
            });
        }

        targetUserId = targetUser.id;

        // Currently Enforces sharing restrictions on database level
        const results = await sqlHelper.shareSensor(targetUserId, user.id, sensor);
        if (results === null) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Unable to share sensor.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
        }
    } catch (e) {
        console.error('Error creating sensor_profile: ', e);
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "Sensor already shared to user.", errorCodes.ER_SENSOR_ALREADY_SHARED);
        }

        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL);
    }

    // Sharing was successful, send notification e-mail
    try {
        const sensorName = await getSensorName(sensor, sqlHelper);
        if (sensorName === null) {
            console.log(`Sensor profile not found for owner for ${sensor}`);
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Share successful, but unable to send e-mail.', errorCodes.ER_UNABLE_TO_SEND_EMAIL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
        }

        console.log(`User ${user.email} (${user.id}) sending e-mail notification for sensor ${sensorName} (${sensor}) to ${targetUserEmail} (${targetUserId})`);
        await emailHelper.sendShareNotification(
            targetUserEmail,
            sensorName,
            user.email
        );
    } catch (e) {
        console.error("Failed to send e-mail", e.message);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Share successful. Failed to send notification.", errorCodes.ER_UNABLE_TO_SEND_EMAIL);
    }

    // Run clean up function
    console.log(`User ${user.id} shared sensor ${sensor} successfully to ${targetUserId}`);

    return gatewayHelper.successResponse({
        sensor: sensor
    });
}
