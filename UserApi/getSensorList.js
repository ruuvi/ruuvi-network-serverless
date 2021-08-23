const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const dynamoHelper = require('../Helpers/dynamoHelper');
const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeGetSensorList, event, context);

/**
 * Fetches list of tags the user has shared.
 *
 * @param {object} event
 * @param {object} context
 */
const executeGetSensorList = async (event, context, sqlHelper) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    let queryArguments = [user.id, user.id];
    let sensorFilter = '';
    let filteredSensorId = null;

    if (
        event.queryStringParameters
        && validator.hasKeys(event.queryStringParameters, ['sensor'])
        && validator.validateMacAddress(event.queryStringParameters.sensor)
    ) {
        sensorFilter = 'AND sensors.sensor_id = ?';
        filteredSensorId = event.queryStringParameters.sensor;
        queryArguments.push(filteredSensorId);
    }

    const sensors = await sqlHelper.query({
        sql: `SELECT
                sensors.sensor_id AS sensor,
                sensor_profiles.name AS name,
                sensor_profiles.picture AS picture,
                sensors.public AS public,
                sensors.can_share AS canShare
            FROM sensor_profiles
            INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
            WHERE
                sensors.owner_id = ?
                AND sensor_profiles.is_active = 1
                AND sensor_profiles.user_id = ?
                ${sensorFilter}`,
        timeout: 1000,
        values: queryArguments
    });

    let formatted = [];

    for (let sensor of sensors) {
        sensor.public = sensor.public ? true : false;
        sensor.canShare = sensor.canShare ? true : false;
        if (!sensor.canShare) {
            const data = await dynamoHelper.getSensorData(sensor.sensor, 1, null, null);
            if (data.length > 0) {
                sensor.canShare = true;
                await sqlHelper.setValue('can_share', 1, 'sensors', 'sensor_id', sensor.sensor);
            }
        }

        sensor.sharedTo = [];
        formatted.push(JSON.parse(JSON.stringify(sensor)));
    }

    // Fetch Shares
    const sharedSensors = await sqlHelper.query({
        sql: `SELECT
                sensor_profiles.sensor_id AS sensor,
                users.email AS sharedTo
            FROM sensor_profiles
            INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
            INNER JOIN users ON users.id = sensor_profiles.user_id
            WHERE
                sensors.owner_id = ?
                AND sensor_profiles.is_active = 1
                AND sensor_profiles.user_id != ?`,
        timeout: 1000,
        values: [user.id, user.id]
    });

    for (const sensor of sharedSensors) {
        var found = formatted.findIndex(s => s.sensor === sensor.sensor);
        
        // Broken reference
        if (found === -1) {
            console.log('Not found', sensor);
            continue;
        }

        // Not the filtered sensor
        if (filteredSensorId !== null) {
            const filteredShared = sharedSensors.filter(s => s.sensor === filteredSensorId);
            if (filteredShared.length === 0) {
                console.log('filtered shared ' + filteredSensorId + ' ' + s.sensor);
                continue;
            }
        }
        formatted[found].sharedTo.push(sensor.sharedTo);
    }

    // Fetch Shared to Me
    const sensorsSharedToMe = await sqlHelper.query({
        sql: `SELECT
                sensors.sensor_id AS sensor,
                current_profile.name AS name,
                current_profile.picture AS picture,
                sensors.public AS public,
                sensors.can_share AS canShare
            FROM sensors
            LEFT JOIN sensor_profiles current_profile ON
                current_profile.sensor_id = sensors.sensor_id
            WHERE
                sensors.owner_id != ?
                AND current_profile.is_active = 1
                AND current_profile.user_id = ?
                ${sensorFilter}`,
        timeout: 1000,
        values: queryArguments
    });

    let formattedSharedToMe = [];

    for (let sensor of sensorsSharedToMe) {
        sensor.public = sensor.public ? true : false;
        sensor.canShare = false;
        formattedSharedToMe.push(JSON.parse(JSON.stringify(sensor)));
    }

    return gatewayHelper.successResponse({
        sensors: formatted,
        sharedToMe: formattedSharedToMe
    });
}
