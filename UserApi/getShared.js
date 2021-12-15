const gatewayHelper = require('../Helpers/gatewayHelper');
const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeGetShared, event, context);

/**
 * Fetches list of tags the user has shared.
 *
 * @param {object} event
 * @param {object} context
 */
const executeGetShared = async (event, context, sqlHelper, user) => {
  const sensors = await sqlHelper.query({
    sql: `SELECT
                sensors.sensor_id AS sensor,
                sensor_profiles.name AS name,
                sensor_profiles.picture AS picture,
                sensors.public AS public,
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

  // Format returned data properly
  const formatted = [];
  sensors.forEach((sensor) => {
    sensor.public = !!sensor.public;
    formatted.push(sensor);
  });

  return gatewayHelper.successResponse({
    sensors: formatted
  });
};
