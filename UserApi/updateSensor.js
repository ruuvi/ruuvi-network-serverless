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

    let updates = [];
    let values = [];
    let ret = {
        sensor: sensor
    };

	if (validator.hasKeys(eventBody, ['name']) && eventBody.name) {
        updates.push('name = ?');
        values.push(eventBody.name);
        ret.name = eventBody.name;
    }
	if (validator.hasKeys(eventBody, ['public']) && (parseInt(eventBody.public) === 0 || parseInt(eventBody.public) === 1)) {
        updates.push('public = ?');
        values.push(parseInt(eventBody.public));
        ret.public = eventBody.public;
    }
    if (updates.length === 0) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "No values provided for update.");
    }

    const updateString = updates.join(', ');

    // Where condition values
    values.push(sensor);
    values.push(user.id);

	try {
        results = await mysql.query({
            sql: `UPDATE sensors
                    SET ${updateString},
                    updated_at = CURRENT_TIMESTAMP
                  WHERE
                    sensor_id = ?
                    AND owner_id = ?`,
            timeout: 1000,
            values: values
        });
		if (results.affectedRows !== 1) {
			return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Sensor not claimed or found. Data not updated.");
		}
        await mysql.end();
    } catch (e) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse(ret);
}
