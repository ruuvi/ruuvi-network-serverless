const gatewayHelper = require('../Helpers/gatewayHelper');
const dynamoHelper = require('../Helpers/dynamoHelper');
const validator = require('../Helpers/validator');
const auth = require('../Helpers/authHelper');
const errorCodes = require('../Helpers/errorCodes');

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
    const rawDataTTL = parseInt(process.env.RAW_DATA_TTL);

    // Validation
    if (
        !query
        || !query.hasOwnProperty('sensor')
        || !validator.validateMacAddress(query.sensor)) {

        // Invalid request
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.', errorCodes.ER_INVALID_FORMAT);
    }

    if (
        query.hasOwnProperty('sort')
        && !(['asc', 'desc'].includes(query.sort))
    ) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid sort argument.', errorCodes.ER_INVALID_SORT_MODE);
    }

    if (
        query.hasOwnProperty('mode')
        && !(['dense', 'sparse', 'mixed'].includes(query.mode))
    ) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid mode argument.', errorCodes.ER_INVALID_DENSITY_MODE);
    }


    let sinceTime = null;
    let untilTime = null;

    if (query.hasOwnProperty('since') && parseInt(query.since)) {
        sinceTime = parseInt(query.since);
    }
    if (query.hasOwnProperty('until') && parseInt(query.until)) {
        untilTime = parseInt(query.until);
    }

    if (
        (sinceTime !== null && untilTime !== null && sinceTime > untilTime)
        || (untilTime === null && sinceTime > validator.now()))
    {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, '`since` is after `until` or in the future.', errorCodes.ER_INVALID_TIME_RANGE);
    }

    // Format arguments
    const ascending = query.hasOwnProperty('sort') && query.sort === 'asc';
    let mode = query.hasOwnProperty('mode') ? query.mode : 'mixed';
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
                LEFT JOIN sensor_profiles ON
                    sensor_profiles.sensor_id = sensors.sensor_id
                WHERE
                    sensors.sensor_id = ?
                    AND (
                        (
                            sensor_profiles.user_id = ?
                            AND sensor_profiles.is_active = 1
                        ) OR (
                            sensors.public = 1
                            AND sensor_profiles.user_id = sensors.owner_id
                        )
                    )`,
            timeout: 1000,
            values: [
                sensor,
                user.id
            ]
        });
        if (hasClaim.length === 0) {
            return gatewayHelper.forbiddenResponse();
        }
        name = hasClaim[0].name;
    } catch (e) {
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Internal server error.', errorCodes.ER_INTERNAL);
    }

    // Fetch from long term storage if requested for longer than TTL
    let dataPoints = [];
    let tableName = null;

    // If data type is 'mixed' but we're fetching for a range exclusively within either - switch mode
    const splitPoint = validator.now() - rawDataTTL;
    if (mode == 'mixed') {
        if (splitPoint < sinceTime) {
            mode = 'dense';
        } else if (splitPoint > untilTime) {
            mode = 'sparse';
        }
    }

    if (mode !== 'mixed') {
        if (mode === 'sparse') {
            tableName = process.env.REDUCED_TABLE_NAME;
        } else if (mode === 'dense') {
            tableName = process.env.TABLE_NAME;
        }
        dataPoints = await dynamoHelper.getSensorData(sensor, resultLimit, sinceTime, untilTime, ascending, tableName);
    } else {
        const sparse = await dynamoHelper.getSensorData(sensor, resultLimit, sinceTime, splitPoint, ascending, process.env.REDUCED_TABLE_NAME);
        const dense = await dynamoHelper.getSensorData(sensor, resultLimit, splitPoint, untilTime, ascending, process.env.TABLE_NAME);

        // Combine results
        dataPoints = sparse.concat(dense);
    }

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

    let response = {
        sensor: sensor,
        name: name,
        total: data.length,
        measurements: data
    };

    if (parseInt(process.env.DEBUG) === 1) {
        response.table = tableName;
        response.resolvedMode = mode;
    }

    return gatewayHelper.successResponse(response);
};
