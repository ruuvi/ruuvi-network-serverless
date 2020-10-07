const gatewayHelper = require('../Helpers/gatewayHelper');
const dynamoHelper = require('../Helpers/dynamoHelper');
const validator = require('../Helpers/validator');
const auth = require('../Helpers/authHelper');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

exports.handler = async (event, context) => {
    // Authorization
    let user = null;
    if (process.env.REQUIRE_LOGIN == 1) {
        user = await auth.authorizedUser(event.headers);
        if (!user) {
            return gatewayHelper.unauthorizedResponse();
        }
    }

    const query = event.queryStringParameters;

    // Validation
    if (
        !query
        || !query.hasOwnProperty('sensor')
        || !validator.validateAlphaNumeric(query.sensor)) {

        // Invalid request
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.');
    }

    let sinceTime = null;
    let untilTime = null;

    if (query.hasOwnProperty('since') && parseInt(query.since)) {
        sinceTime = parseInt(query.since);
    }
    if (query.hasOwnProperty('until') && parseInt(query.until)) {
        untilTime = parseInt(query.until);
    }

    const sensor = query.sensor;

    if (user) {
        const hasClaim = await mysql.query({
            sql: `SELECT id
                FROM sensors
                WHERE
                    (
                        owner_id = ?
                        OR public = 1
                    )
                    AND sensor_id = ?
                UNION
                SELECT share_id
                FROM shared_sensors
                WHERE
                    user_id = ?
                    AND sensor_id = ?`,
            timeout: 1000,
            values: [
                user.id,
                sensor,
                user.id,
                sensor
            ]
        });
        if (hasClaim.length === 0) {
            return gatewayHelper.forbiddenResponse();
        }
    }

    const dataPoints = await dynamoHelper.getSensorData(sensor, process.env.DEFAULT_RESULTS, sinceTime, untilTime);

    // Format data for the API
    let data = [];
    dataPoints.forEach((item) => {
        data.push({
            sensor: item.SensorId,
            coordinates: item.Coordinates,
            data: item.SensorData,
            gwmac: item.GatewayMac,
            timestamp: item.MeasurementTimestamp,
            rssi: item.RSSI
        });
    });

    return gatewayHelper.successResponse({
        sensor: sensor,
        total: data.length,
        measurements: data
    });
};
