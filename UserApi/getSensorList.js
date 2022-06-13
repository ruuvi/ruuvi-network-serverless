const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const dynamoHelper = require('../Helpers/dynamoHelper');
const { userWrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => userWrapper(executeGetSensorList, event, context);

/**
 * Fetches list of tags the user has shared.
 *
 * @param {object} event
 * @param {object} context
 */
const executeGetSensorList = async (event, context, sqlHelper, user) => {
  const queryArguments = [user.id, user.id];
  let sensorFilter = '';
  let filteredSensorId = null;

  if (
    event.queryStringParameters &&
        validator.hasKeys(event.queryStringParameters, ['sensor']) &&
        validator.validateMacAddress(event.queryStringParameters.sensor)
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
                sensors.can_share AS canShare,
                sensors.offset_humidity AS offsetHumidity,
                sensors.offset_temperature AS offsetTemperature,
                sensors.offset_pressure AS offsetPressure
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

  const formatted = [];

  for (const sensor of sensors) {
    sensor.public = !!sensor.public;
    sensor.canShare = !!sensor.canShare;
    sensor.measurements = await fetchLatestDataPoint(sensor);
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
    const found = formatted.findIndex(s => s.sensor === sensor.sensor);

    // Broken reference
    if (found === -1) {
      console.log('Not found', sensor);
      continue;
    }

    // Not the filtered sensor
    if (filteredSensorId !== null) {
      const filteredShared = sharedSensors.filter(s => s.sensor === filteredSensorId);
      if (filteredShared.length === 0) {
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
                sensors.can_share AS canShare,
                sensors.offset_humidity AS offsetHumidity,
                sensors.offset_temperature AS offsetTemperature,
                sensors.offset_pressure AS offsetPressure
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

  const formattedSharedToMe = [];

  for (const sensor of sensorsSharedToMe) {
    sensor.public = !!sensor.public;
    sensor.canShare = false;
    sensor.measurements = await fetchLatestDataPoint(sensor);
    formattedSharedToMe.push(JSON.parse(JSON.stringify(sensor)));
  }

  return gatewayHelper.successResponse({
    sensors: formatted,
    sharedToMe: formattedSharedToMe
  });
};

const fetchLatestDataPoint = async (sensor) => {
  const data = await dynamoHelper.getSensorData(sensor.sensor, 1, null, null);
  // Format data for the API
  const dataPoints = [];
  data.forEach((item) => {
    dataPoints.push({
      coordinates: item.Coordinates,
      data: item.SensorData,
      gwmac: item.GatewayMac,
      timestamp: item.MeasurementTimestamp,
      rssi: item.RSSI
    });
  });
  return dataPoints;
};
