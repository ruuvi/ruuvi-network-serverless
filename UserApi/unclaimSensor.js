const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes');
const emailHelper = require('../Helpers/emailHelper');

const wrapper = require('../Helpers/wrapper').wrapper;

exports.handler = async (event, context) => wrapper(executeUnclaimSensor, event, context, true);

/**
 * Unclaims a sensor.
 *
 * @param {object} event
 * @param {object} context
 */
const executeUnclaimSensor = async (event, context, sqlHelper, user) => {
    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor id.", errorCodes.ER_MISSING_ARGUMENT);
    }

    const sensor = eventBody.sensor;

    // Cache shares
    let existingShares = [];

    // ------------------------------------------------------------------------
    // DEPRECATED: BACKWARDS COMPATIBILITY FOR UNCLAIMING WORKING FOR UNSHARING
    // ------------------------------------------------------------------------
    var sensorData = await sqlHelper.fetchSingle('sensor_id', sensor, 'sensors');
    if (parseInt(sensorData.owner_id) !== user.id) {
        const unshareEndpoint = require('../UserApi/unshareSensor');
        let unshareEvent = {
            ...event,
            body: JSON.stringify({ sensor: sensor })
        };

        return await unshareEndpoint.executeUnshareSensor(unshareEvent, null, sqlHelper, user);
    }
    // ------------------------------------------------------------------------

    // Get sharees to notify
    existingShares = await sqlHelper.getShares(sensor);
    
    // Remove profiles
    const removedProfiles = await sqlHelper.removeSensorProfiles(sensor, user.id);
    if (removedProfiles < 0) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }
    console.log(`Removed ${removedProfiles} profiles for sensor ${sensor}`);
   
    // Remove sensor
    const removedSensors = await sqlHelper.removeSensor(sensor);
    if (removedSensors !== 1) {
        console.log(`User ${user.id} successfully unclaimed ${sensor}`);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.FORBIDDEN, "Sensor does not belong to user.", errorCodes.ER_FORBIDDEN);
    } else if (removedSensors < 0) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }
    console.log(`Removed ${removedSensors} sensor ${sensor}`);

    // Clear alerts for the sensor
    await sqlHelper.deleteAlertsForSensor(sensor);
    console.log(`Removed alerts for sensor ${sensor}`);

    // Notify about the removal of existing shares
    for (const share of existingShares) {
        console.log('Sending share remove notification for sensor ' + share.name + ' to ' + share.email + ' from ' + user.email);
        await emailHelper.sendShareRemovedNotification(
            share.email,
            share.name,
            user.email
        );
    }

    return gatewayHelper.successResponse();
}
