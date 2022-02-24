const gatewayHelper = require('../Helpers/gatewayHelper');
const dynamoHelper = require('../Helpers/dynamoHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes');
const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeGetSensorData, event, context);

const executeGetSensorData = async (event, context, sqlHelper, user) => {
  const query = event.queryStringParameters;
  const rawDataTTL = parseInt(process.env.RAW_DATA_TTL);

  // Validation
  if (!Object.prototype.hasOwnProperty.call(query, 'sensor') ||
        !validator.validateMacAddress(query.sensor)) {
    // Invalid request
    await sqlHelper.disconnect();
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.', errorCodes.ER_INVALID_FORMAT);
  }

  if (Object.prototype.hasOwnProperty.call(query, 'sort') &&
        !(['asc', 'desc'].includes(query.sort))
  ) {
    await sqlHelper.disconnect();
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid sort argument.', errorCodes.ER_INVALID_SORT_MODE);
  }

  if (Object.prototype.hasOwnProperty.call(query, 'mode') &&
        !(['dense', 'sparse', 'mixed'].includes(query.mode))
  ) {
    await sqlHelper.disconnect();
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid mode argument.', errorCodes.ER_INVALID_DENSITY_MODE);
  }

  let sinceTime = null;
  let untilTime = null;

  if (Object.prototype.hasOwnProperty.call(query, 'since') && parseInt(query.since)) {
    sinceTime = parseInt(query.since);
  }
  if (Object.prototype.hasOwnProperty.call(query, 'until') && parseInt(query.until)) {
    untilTime = parseInt(query.until);
  }

  if ((sinceTime !== null && untilTime !== null && sinceTime > untilTime) ||
        (untilTime === null && sinceTime > validator.now())) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, '`since` is after `until` or in the future.', errorCodes.ER_INVALID_TIME_RANGE);
  }

  // Format arguments
  const ascending = Object.prototype.hasOwnProperty.call(query, 'sort') && query.sort === 'asc';
  let mode = Object.prototype.hasOwnProperty.call(query, 'mode') ? query.mode : 'mixed';
  const sensor = query.sensor;
  const resultLimit = Object.prototype.hasOwnProperty.call(query, 'limit')
    ? Math.min(parseInt(query.limit), process.env.MAX_RESULTS)
    : process.env.DEFAULT_RESULTS;

  const response = {
    sensor: sensor,
    name: '',
    offsetTemperature: null,
    offsetHumidity: null,
    offsetPressure: null,
    picture: null,
    measurements: [],
    total: 0
  };

  try {
    const hasClaim = await sqlHelper.query({
      sql: `SELECT
                    sensors.id,
                    current_profile.name AS name,
                    current_profile.picture AS picture,
                    sensors.public AS public,
                    sensors.offset_temperature AS offsetTemperature,
                    sensors.offset_humidity AS offsetHumidity,
                    sensors.offset_pressure AS offsetPressure
                FROM sensors
                LEFT JOIN sensor_profiles current_profile ON
                    current_profile.sensor_id = sensors.sensor_id
                WHERE
                    sensors.sensor_id = ?
                    AND (
                        (
                            current_profile.user_id = ?
                            AND current_profile.is_active = 1
                        ) OR (
                            sensors.public = 1
                            AND current_profile.user_id = sensors.owner_id
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
    response.name = hasClaim[0].name;
    response.public = hasClaim[0].public;
    response.offsetTemperature = hasClaim[0].offsetTemperature;
    response.offsetHumidity = hasClaim[0].offsetHumidity;
    response.offsetPressure = hasClaim[0].offsetPressure;
    response.picture = hasClaim[0].picture;
  } catch (e) {
    console.error(e);
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Internal server error.', errorCodes.ER_INTERNAL);
  }

  // Fetch from long term storage if requested for longer than TTL
  let dataPoints = [];
  let tableName = null;

  // If data type is 'mixed' but we're fetching for a range exclusively within either - switch mode
  const splitPoint = validator.now() - rawDataTTL;
  if (mode === 'mixed') {
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
    // Merge tables if dense table does not have up to limit datapoints.
    const dense = await dynamoHelper.getSensorData(sensor, resultLimit, splitPoint, untilTime, ascending, process.env.TABLE_NAME);
    const sparseLimit = resultLimit - (dense.length);
    if (sparseLimit > 0) {
      const sparse = await dynamoHelper.getSensorData(sensor, sparseLimit, sinceTime, splitPoint, ascending, process.env.REDUCED_TABLE_NAME);
      // Combine results
      if (ascending) {
        dataPoints = sparse.concat(dense);
      } else {
        dataPoints = dense.concat(sparse);
      }
    } else {
      dataPoints = dense;
    }
  }

  // Format data for the API
  const data = [];
  dataPoints.forEach((item) => {
    data.push({
      coordinates: item.Coordinates,
      data: item.SensorData,
      gwmac: item.GatewayMac,
      timestamp: item.MeasurementTimestamp,
      rssi: item.RSSI
    });
  });

  response.total = data.length;
  response.measurements = data;

  if (parseInt(process.env.DEBUG) === 1) {
    response.table = tableName;
    response.resolvedMode = mode;
  }

  return gatewayHelper.successResponse(response);
};
