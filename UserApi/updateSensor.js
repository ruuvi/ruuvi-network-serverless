const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const sqlHelper = require('../Helpers/sqlHelper');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

/**
 * Updates sensor profile (currently name)
 *
 * @param {object} event
 * @param {object} context
 */
exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['sensor'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor");
    }

    const sensor = eventBody.sensor;

    let sensorUpdates = [];
    let sensorValues = [];

    let profileUpdates = [];
    let profileValues = [];

    let ret = {
        sensor: sensor
    };

	if (validator.hasKeys(eventBody, ['name']) && eventBody.name) {
        profileUpdates.push('name = ?');
        profileValues.push(eventBody.name);
        ret.name = eventBody.name;
    }
	if (validator.hasKeys(eventBody, ['public']) && (parseInt(eventBody.public) === 0 || parseInt(eventBody.public) === 1)) {
        sensorUpdates.push('public = ?');
        sensorValues.push(parseInt(eventBody.public));
        ret.public = eventBody.public;
    }
    if (sensorUpdates.length === 0 && profileUpdates.length === 0) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "No values provided for update.");
    }

	try {
        if (profileUpdates.length) {
            const profileResult = await sqlHelper.updateValues(
                'sensor_profiles',
                profileUpdates,
                profileValues,
                ['sensor_id = ?', 'user_id = ?', 'is_active = ?'],
                [sensor, user.id, 1]
            );

            if (profileResult !== 1) {
                return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Sensor not claimed or found. Data not updated.");
            }    
        }

        if (sensorUpdates.length) {
            const sensorResult = await sqlHelper.updateValues(
                'sensors',
                sensorUpdates,
                sensorValues,
                ['sensor_id = ?', 'owner_id = ?'],
                [sensor, user.id]
            );

            if (sensorResult !== 1) {
                return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Sensor not claimed or found. Data not updated.");
            }    
        }

        await mysql.end();
    } catch (e) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse(ret);
}
