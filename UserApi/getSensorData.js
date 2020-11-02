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
        || !validator.validateMacAddress(query.sensor)) {

        // Invalid request
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.');
    }

    if (
        query.hasOwnProperty('sort')
        && !(['asc', 'desc'].includes(query.sort))
    ) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid sort argument.');
    }

    let sinceTime = null;
    let untilTime = null;

    if (query.hasOwnProperty('since') && parseInt(query.since)) {
        sinceTime = parseInt(query.since);
    }
    if (query.hasOwnProperty('until') && parseInt(query.until)) {
        untilTime = parseInt(query.until);
    }

    // Format arguments
    const ascending = query.hasOwnProperty('sort') && query.sort === 'asc';
    const sensor = query.sensor;
    const resultLimit = query.hasOwnProperty('limit')
        ? Math.min(parseInt(query.limit), process.env.MAX_RESULTS)
        : process.env.DEFAULT_RESULTS;

    let name = '';
    try {
        const hasClaim = await mysql.query({
            sql: `SELECT
                    sensors.id,
                    sensor_profiles.name AS name
                FROM sensors
                INNER JOIN sensor_profiles ON
                    sensor_profiles.sensor_id = sensors.sensor_id
                    AND sensor_profiles.user_id = sensors.owner_id
                WHERE
                    (
                        sensors.owner_id = ?
                        OR sensors.public = 1
                    )
                    AND sensors.sensor_id = ?
                UNION
                SELECT
                    sensor_profiles.id,
                    sensor_profiles.name AS name
                FROM sensor_profiles
                INNER JOIN sensors ON sensor_profiles.sensor_id = sensors.sensor_id
                WHERE
                    sensor_profiles.user_id = ?
                    AND sensor_profiles.sensor_id = ?
                    AND sensor_profiles.is_active = 1`,
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
        name = hasClaim[0].name;
    } catch (e) {
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Internal server error.');
    }

    const dataPoints = await dynamoHelper.getSensorData(sensor, resultLimit, sinceTime, untilTime, ascending);

    // Format data for the API
    let data = [];
    dataPoints.forEach((item) => {
        data.push({
            coordinates: item.Coordinates,
            data: item.SensorData,
            gwmac: item.GatewayMac,
            timestamp: item.MeasurementTimestamp,
            rssi: item.RSSI
        });
    });

    return gatewayHelper.successResponse({
        sensor: sensor,
        name: name,
        total: data.length,
        measurements: data
    });
};
