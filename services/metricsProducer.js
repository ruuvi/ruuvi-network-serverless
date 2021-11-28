const sqlHelper = require('../Helpers/sqlHelper');

const instrumentUserStatistics = async (sql) => {
  try {
    const result = await sql.query({
      sql: `SELECT
					COUNT(DISTINCT users.id) AS user_count,
					COUNT(DISTINCT claimed.id) AS claimed_sensors
				FROM users
				LEFT JOIN sensors claimed ON claimed.owner_id = users.id;`,
      timeout: 5000
    });

    console.log('INS:USERS:' + result[0].user_count);
    console.log('INS:CLAIMED:' + result[0].claimed_sensors);
  } catch (e) {
    console.error('Error instrumenting users: ' + e.message);
  }

  try {
    const shareResult = await sql.query({
      sql: `SELECT
					COUNT(DISTINCT sensors.sensor_id) AS shared_sensor_count,
					COUNT(DISTINCT sensor_profiles.id) AS share_count
				  FROM sensor_profiles
				  INNER JOIN sensors ON
					sensors.owner_id != sensor_profiles.user_id
					AND sensors.sensor_id = sensor_profiles.sensor_id;`,
      timeout: 5000
    });

    console.log('INS:SHARED_UNIQUE:' + shareResult[0].shared_sensor_count);
    console.log('INS:SHARED:' + shareResult[0].share_count);
  } catch (e) {
    console.error('Error instrumenting users: ' + e.message);
  }
};

/**
 * Serves a single file for Apple file validation.
 */
exports.handler = async (event, context) => {
  try {
    await instrumentUserStatistics(sqlHelper);
  } catch (e) {
    console.error('Error instrumenting: ' + e.message);
    return {
      result: 'Failed to instrument: ' + e.message
    };
  }

  await sqlHelper.disconnect();

  return {
    result: 'Action performed.'
  };
};
