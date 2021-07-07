const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const sqlHelper = require('../Helpers/sqlHelper');
const errorCodes = require('../Helpers/errorCodes');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD,
        charset  : 'utf8mb4'
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
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor", errorCodes.ER_MISSING_ARGUMENT);
    }

    const sensor = eventBody.sensor;

    let sensorUpdates = [];
    let sensorValues = [];

    let profileUpdates = [];
    let profileValues = [];

    let ret = {
        sensor: sensor
    };

    // Sensor Profile updates
	if (validator.hasKeys(eventBody, ['name']) && eventBody.name) {
        profileUpdates.push('name = ?');
        profileValues.push(eventBody.name);
        ret.name = eventBody.name;
    }

    // Sensor updates
	if (validator.hasKeys(eventBody, ['public']) && (parseInt(eventBody.public) === 0 || parseInt(eventBody.public) === 1)) {
        sensorUpdates.push('public = ?');
        sensorValues.push(parseInt(eventBody.public));
        ret.public = eventBody.public;
    }
    // TODO: Tidy up duplication
	if (validator.hasKeys(eventBody, ['offsetTemperature']) && !isNaN(parseInt(eventBody.offsetTemperature))) {
        sensorUpdates.push('offset_temperature = ?');
        sensorValues.push(parseFloat(eventBody.offsetTemperature));
        ret.offsetTemperature = eventBody.offsetTemperature;
    }
	if (validator.hasKeys(eventBody, ['offsetHumidity']) && !isNaN(parseInt(eventBody.offsetHumidity))) {
        sensorUpdates.push('offset_humidity = ?');
        sensorValues.push(parseFloat(eventBody.offsetHumidity));
        ret.offsetHumidity = eventBody.offsetHumidity;
    }
    if (validator.hasKeys(eventBody, ['offsetPressure']) && !isNaN(parseInt(eventBody.offsetPressure))) {
        sensorUpdates.push('offset_pressure = ?');
        sensorValues.push(parseFloat(eventBody.offsetPressure));
        ret.offsetPressure = eventBody.offsetPressure;
    }

    if (sensorUpdates.length === 0 && profileUpdates.length === 0) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "No values provided for update.", errorCodes.ER_MISSING_ARGUMENT);
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
                return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Sensor not claimed or found. Data not updated.", errorCodes.ER_SENSOR_NOT_FOUND);
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
                return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Sensor not claimed or found. Data not updated.", errorCodes.ER_SENSOR_NOT_FOUND);
            }    
        }
        await mysql.end();
    } catch (e) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.", errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }

    return gatewayHelper.successResponse(ret);
}
