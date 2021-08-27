const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const userHelper = require('../Helpers/userHelper');
const emailHelper = require('../Helpers/emailHelper');
const errorCodes = require('../Helpers/errorCodes');

const wrapper = require('../Helpers/wrapper').wrapper;

exports.handler = async (event, context) => wrapper(executeUnshareSensor, event, context);

const executeUnshareSensor = async (event, context, sqlHelper) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor or e-mail.", errorCodes.ER_MISSING_ARGUMENT);
    }

    const sensor = eventBody.sensor;
    const targetUserEmail = eventBody.user;

    // Required when owner of the sensor
    if (targetUserEmail && !validator.validateEmail(targetUserEmail)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid E-mail given.", errorCodes.ER_INVALID_EMAIL_ADDRESS);
    }

    if (!validator.validateMacAddress(sensor)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid sensor ID given.", errorCodes.ER_INVALID_MAC_ADDRESS);
    }

    try {
        let targetUser = null;
        let targetUserId = null;

        if (targetUserEmail) {
            targetUser = await userHelper.getByEmail(targetUserEmail);
            if (!targetUser) {
                console.error("User not found: " + targetUserEmail + " while unsharing " + sensor);
                return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "User not found.", errorCodes.ER_USER_NOT_FOUND);
            }
            targetUserId = targetUser.id;
        }

        // Fetch sensor for owner information
        const ownerInfo = await sqlHelper.fetchSingle('sensor_id', sensor, 'sensors');
        if (ownerInfo === null) {
            console.log("Error fetching sensor: " + sensor);
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Sensor not found.", errorCodes.ER_SENSOR_NOT_FOUND);
        }

        const owner = ownerInfo.owner_id;
        let wasRemoved = false;

        if (targetUser !== null && user.id === owner) {
            // Remove sensor you shared
            const sensorProfiles = await sqlHelper.fetchMultiCondition(['sensor_id', 'user_id'], [sensor, targetUserId], 'sensor_profiles');
            let sensorName = sensor;
            if (sensorProfiles !== null && sensorProfiles.length === 1 && sensorProfiles[0] !== null && sensorProfiles[0] !== '') {
                sensorName = sensorProfiles[0].name;
            }
            wasRemoved = await sqlHelper.removeSensorProfileForUser(sensor, targetUserId, user.id);

            if (wasRemoved > 0) {
                // Success
                console.log(`User ${user.id} unshared sensor ${sensor} from ${targetUserId}`);
                await emailHelper.sendShareRemovedNotification(
                    targetUserEmail,
                    sensorName, // We probably want to fetch the localized sensor name for this
                    user.email
                );
            } else {
                console.error(`User ${user.id} tried to unshare a sensor ${sensor} from ${targetUserId} but it was unsuccessful.`);
            }
        } else {
            // Remove sensor shared to you
            const sensorProfiles = await sqlHelper.fetchMultiCondition(['sensor_id', 'user_id'], [sensor, user.id], 'sensor_profiles');
            let sensorName = sensor;
            if (sensorProfiles !== null && sensorProfiles.length === 1 && sensorProfiles[0] !== null) {
                sensorName = sensorProfiles[0].name;
            }
            wasRemoved = await sqlHelper.removeSensorProfileForUser(sensor, user.id, owner);

            if (wasRemoved > 0) {
                const ownerUser = await sqlHelper.fetchSingle('id', owner, 'users');
                if (ownerUser === null) {
                    return gatewayHelper.errorResponse(gatew.HTTPCodes.INVALID, "Error sending notification to owner.", errorCodes.ER_UNABLE_TO_SEND_EMAIL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
                }

                console.log(`User ${user.email} (${user.id}) unshared sensor shared to you: ${sensorName} (${sensor}) from ${ownerUser.email} (${owner})`);
                await emailHelper.sendShareRemovedNotification(
                    ownerUser.email,
                    sensorName,
                    null,
                    user.email,
                    'UnshareByShareeNotification'
                );
            }
        }

        if (wasRemoved <= 0) {
            console.error(`User ${user.email} (${user.id}) tried to unshare a sensor ${sensor} but it was unsuccessful.`);
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "No access to sensor or sensor not shared.", errorCodes.ER_FORBIDDEN);
        }
    } catch (e) {
        console.error('Internal error unsharing', e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL);
    }

    return gatewayHelper.successResponse();
}
