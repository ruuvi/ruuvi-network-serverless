const validator = require('../Helpers/validator');

const mysql = require('serverless-mysql')({
  config: {
    host: process.env.DATABASE_ENDPOINT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    charset: 'utf8mb4',
    zombieMaxTimeout: 30
  }
});

/**
 * Inserts a single row to a table
 *
 * @param {array} newObject Object with keys as the sql field names and corresponding values
 * @param {string} table Target table
 * @returns {object} True on success
 */
const insertSingle = async (newObject, table) => {
  if (!newObject || !table) {
    console.error('Invalid input data', newObject, table);
    return null;
  }

  const keys = Object.keys(newObject);
  const fieldNames = keys.join(',');
  const valueHolders = new Array(keys.length).fill('?').join(',');

  const values = [];
  for (const key of keys) {
    values.push(newObject[key]);
  }

  try {
    return await mysql.query({
      sql: `INSERT INTO ${table} (
                    ${fieldNames}
                ) VALUES (
                    ${valueHolders}
                );`,
      timeout: 5000,
      values: values
    });
  } catch (err) {
    console.error(err);
    return err;
  }
};

/**
 * Fetches a row by id column
 *
 * @param {string} field Field name to use for filtering
 * @param {string} value Value to filter by
 * @param {string} table Target table
 * @returns {object} First result or null if none
 */
const fetchSingle = async (field, value, table) => {
  const single = await fetchMultiCondition([field], [value], table, 1);
  if (single === null || single.length === 0) {
    return null;
  }
  return single[0];
};

/**
 *
 * @param {*} fields
 * @param {*} values
 * @param {*} table
 * @returns
 */
const fetchMultiCondition = async (fields, values, table, limit = 1) => {
  if (fields.length <= 0) {
    console.error('No fields defined for fetchMultiCondition.');
    return null;
  }
  if (fields.length != values.length) {
    console.error('Field count does not match value count.');
    return null;
  }
  if (table === null || table === '' || !validator.validateTableName(table)) {
    console.error('Invalid table name: ' + table);
    return null;
  }

  const fieldCondition = fields.map((f, i) => `${f} = ?`).join(' AND ');
  try {
    const results = await mysql.query({
      sql:
                `SELECT *
                FROM ${table}
                WHERE
                    ${fieldCondition}
                LIMIT ${limit}`,
      timeout: 1000,
      values: values
    });

    return results;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Fetches the value of a single user setting.
 *
 * @param {*} userId
 * @param {*} settingName
 * @returns
 */
const fetchUserSetting = async (userId, settingName) => {
  const results = await fetchMultiCondition(['user_id', '`key`'], [userId, settingName], 'user_settings', 1);
  if (results !== null && results.length > 0) {
    return results[0].value;
  }
  return null;
};

/**
 * Fetches a count by id column
 *
 * @param {string} field Field name to use for filtering
 * @param {string} value Value to filter by
 * @param {string} table Target table
 * @returns {object} First result or null if none
 */
const fetchCount = async (field, value, table) => {
  try {
    const result = await mysql.query({
      sql: `SELECT COUNT(*) AS count FROM ${table} WHERE ${field} = ?`,
      timeout: 1000,
      values: [value]
    });

    if (result.length === 1) {
      return parseInt(result[0].count);
    }
  } catch (err) {
    console.error(err);
    return -1;
  }
  return -1;
};

/**
 * Deletes a single row by id column
 *
 * @param {string} field Field name to use for filtering
 * @param {string} value Value to filter by
 * @param {string} table Target table
 */
const deleteSingle = async (field, value, table) => {
  try {
    const result = await mysql.query({
      sql: `DELETE FROM ${table} WHERE ${field} = ? LIMIT 1`,
      timeout: 1000,
      values: [value]
    });

    if (result.affectedRows === 1) {
      return true;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
  return false;
};

/**
 * Fetches all rows by filtered column
 *
 * @param {string} field Field name to use for filtering
 * @param {string} value Value to filter by
 * @param {string} table Target table
 * @returns {object} First result or null if none
 */
const fetchAll = async (field, value, table, orderByField = null, orderByDirection = 'ASC') => {
  let orderBy = '';
  if (orderByField !== null) {
    orderBy = `ORDER BY ${orderByDirection}`;
  }

  try {
    const results = await mysql.query({
      sql: `SELECT * FROM ${table} WHERE ${field} = ? ${orderBy}`,
      timeout: 1000,
      values: [value]
    });

    return results;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Sets a single value in the database
 *
 * @param {string} field Field name to set
 * @param {string} value Value to set
 * @param {string} table Target table
 * @param {string} keyField Key field for filtering
 * @param {string} keyValue Value of the key
 */
const setValue = async (field, value, table, keyField, keyValue) => {
  const idInt = parseInt(value);
  if (!idInt) {
    return null;
  }

  try {
    const result = await mysql.query({
      sql: `UPDATE ${table} SET ${field} = ? WHERE ${keyField} = ? LIMIT 1`,
      timeout: 1000,
      values: [value, keyValue]
    });

    if (result.affectedRows === 1) {
      return true;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
  return false;
};

/**
 * Updates a list of values
 *
 * @param {string} table
 * @param {array} fields
 * @param {array} values
 * @param {array} whereConditions
 * @param {array} whereValues
 */
const updateValues = async (table, fields, values, whereConditions, whereValues) => {
  // Append where values to the what is being passed
  whereValues.forEach((value) => {
    values.push(value);
  });

  const updateString = fields.join(', ');
  const whereString = whereConditions.join(' AND ');

  try {
    results = await mysql.query({
      sql: `UPDATE ${table}
                    SET ${updateString},
                    updated_at = CURRENT_TIMESTAMP
                WHERE ${whereString}`,
      timeout: 1000,
      values: values
    });
  } catch (err) {
    console.error(err);
    return 0;
  }

  return results.affectedRows;
};

const fetchAlerts = async (sensorId, userId = null) => {
  if (userId === null) {
    return await mysql.query({
      sql:
                `SELECT
                    sensor_alerts.*,
                    sensors.offset_humidity AS offset_humidity,
                    sensors.offset_temperature AS offset_temperature,
                    sensors.offset_pressure AS offset_pressure
                FROM sensor_alerts
                INNER JOIN sensors ON sensors.sensor_id = sensor_alerts.sensor_id
                WHERE sensors.sensor_id = ?`,
      timeout: 3000,
      values: [sensorId]
    });
  } else {
    return await mysql.query({
      sql:
                `SELECT
                    sensor_alerts.*,
                    sensors.offset_humidity AS offset_humidity,
                    sensors.offset_temperature AS offset_temperature,
                    sensors.offset_pressure AS offset_pressure
                FROM sensor_alerts
                INNER JOIN sensors ON sensors.sensor_id = sensor_alerts.sensor_id
                INNER JOIN sensor_profiles ON sensor_profiles.sensor_id = sensors.sensor_id
                WHERE
                    sensors.sensor_id = ?
                    AND sensor_profiles.user_id = ?
                    AND sensor_alerts.user_id = ?`,
      timeout: 3000,
      values: [sensorId, userId, userId]
    });
  }
};

/**
 * Gets the alert of a type for a given sensor.
 *
 * @param {int} userId ID of the user to add the alert
 * @param {string} sensorId ID of the sensor to get the alert for
 * @param {enum} type Type in: ['temperature', 'humidity', 'pressure', 'signal', 'movement']
 * @returns
 */
const saveAlert = async (userId, sensorId, type, enabled = true, min = Number.MIN_VALUE, max = Number.MAX_VALUE, counter = 0, description = '') => {
  if (!validator.validateEnum(type, ['temperature', 'humidity', 'pressure', 'signal', 'movement'])) {
    console.error('Invalid type given: ' + type);
    return [];
  }

  let res = null;

  const enabledInt = enabled === true ? 1 : 0;

  try {
    res = await mysql.query({
      sql: `INSERT INTO sensor_alerts (
                    user_id,
                    sensor_id,
                    alert_type,
                    min_value,
                    max_value,
                    counter,
                    enabled,
                    description
                ) VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                ) ON DUPLICATE KEY UPDATE
                    min_value = VALUES(min_value),
                    max_value = VALUES(max_value),
                    counter = VALUES(counter),
                    description = VALUES(description),
                    enabled = VALUES(enabled),
                    triggered = 0;`,
      timeout: 1000,
      values: [userId, sensorId, type, min, max, counter, enabledInt, description]
    });
  } catch (e) {
    console.error(e);
    return false;
  }
  return res;
};

const deleteAlertsForSensor = async (sensor) => {
  try {
    await mysql.query({
      sql: 'DELETE FROM sensor_alerts WHERE sensor_id = ?',
      timeout: 1000,
      values: [sensor]
    });

    const alertHelper = require('../Helpers/alertHelper');
    alertHelper.refreshAlertCache(sensor);
  } catch (e) {
    console.error(`Error removing alerts for sensor "${sensor}"`, e);
  }
};

const shareSensor = async (userId, ownerId, sensor) => {
  const results = await mysql.query({
    sql: `INSERT INTO sensor_profiles (
                user_id,
                sensor_id,
                name,
                picture
            ) SELECT
                ?,
                sensors.sensor_id,
                COALESCE(sp.name, ''),
                COALESCE(sp.picture, '')
            FROM sensors
            LEFT JOIN sensor_profiles sp ON 
                sp.sensor_id = sensors.sensor_id
                AND sp.user_id = sensors.owner_id
            WHERE
                sensors.owner_id = ?
                AND sensors.owner_id != ?
                AND sensors.sensor_id = ?`,
    timeout: 1000,
    values: [userId, ownerId, userId, sensor]
  });

  if (results.insertId) {
    // Success
    console.log(ownerId + ' shared sensor ' + sensor + ' to ' + userId);
  } else {
    console.log(ownerId + ' failed to share sensor ' + sensor + ' to ' + userId);
    return null;
  }

  return results;
};

/**
 * Fetch all sensors for a users.
 *
 * @param {integer} userId User ID to fetch sensors for.
 * @returns
 */
const fetchSensorsForUser = async (userId, sensorId = null) => {
  const userIdInt = parseInt(userId);

  const values = [userIdInt];
  let filter = '';

  if (sensorId !== null) {
    filter = 'AND current_profile.sensor_id = ?';
    values.push(sensorId);
  }

  const sensors = await mysql.query({
    sql: `SELECT
                sensors.sensor_id AS sensor,
                current_profile.name AS name,
                current_profile.picture AS picture,
                owner.email AS owner,
                sensors.public AS public,
                sensors.offset_humidity AS offsetHumidity,
                sensors.offset_temperature AS offsetTemperature,
                sensors.offset_pressure AS offsetPressure
            FROM sensor_profiles current_profile
            INNER JOIN sensors ON current_profile.sensor_id = sensors.sensor_id
            INNER JOIN users owner ON owner.id = sensors.owner_id
            WHERE
                current_profile.user_id = ?
                AND current_profile.is_active = 1
                ${filter}
            GROUP BY sensors.sensor_id`,
    timeout: 1000,
    values: values
  });
  return sensors;
};

/**
 * Creates a pending invite for a user.
 *
 * @param {string} sensor
 * @param {string} targetEmail
 * @param {integer} creatorId
 * @returns
 */
const createPendingShare = async (sensor, targetEmail, creatorId) => {
  const results = await mysql.query({
    sql: `INSERT INTO pending_shares (
                email,
                sensor_id,
                creator_id
            ) VALUES (
                ?,
                ?,
                ?
            ) ON DUPLICATE KEY UPDATE
                deleted = 0`,
    timeout: 1000,
    values: [targetEmail, sensor, creatorId]
  });

  if (results.insertId) {
    // Success
    console.log(creatorId + ' created pending share of sensor ' + sensor + ' to ' + targetEmail);
  } else {
    console.log(creatorId + ' failed to create a pending share of sensor ' + sensor + ' to ' + targetEmail);
    return null;
  }

  return results;
};

/**
 * Creates a pending invite for a user.
 *
 * @param {string} sensor
 * @param {string} userId
 * @param {string} targetEmail
 * @param {integer} creatorId
 * @returns
 */
const claimPendingShare = async (sensor, userId, targetEmail, creatorId) => {
  const shareResult = await shareSensor(userId, creatorId, sensor);
  if (shareResult === null) {
    console.log(creatorId + ' failed to share ' + sensor + ' to ' + targetEmail);
    return null;
  }

  const results = await mysql.query({
    sql: `UPDATE pending_shares
            SET deleted = 1
            WHERE
                sensor_id = ?
                AND email = ?`,
    timeout: 1000,
    values: [sensor, targetEmail]
  });

  if (results.insertId) {
    // Success
    console.log(targetEmail + '<' + userId + '> claimed pending share of sensor share for ' + sensor);
  } else {
    console.log(targetEmail + '<' + userId + '> failed to claim a pending share of sensor ' + sensor);
    return null;
  }

  return results;
};

/**
 * Returns list of pending shares for a given user.
 *
 * @param {string} targetEmail
 * @returns
 */
const getPendingShares = async (targetEmail) => {
  const validator = require('../Helpers/validator');
  if (!validator.validateEmail(targetEmail)) {
    console.error('Error parsing e-mail: ' + targetEmail);
    return [];
  }

  const sensors = await mysql.query({
    sql: `SELECT *
            FROM pending_shares
            WHERE
                email = ?
                AND deleted = 0`,
    timeout: 1000,
    values: [targetEmail]
  });
  return sensors;
};

const disconnect = async () => {
  await mysql.end();
};

const canReadSensor = async (userId, sensorId) => {
  const readableResults = await mysql.query({
    sql: `SELECT
                sensors.id
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
                )
            LIMIT 1`,
    timeout: 1000,
    values: [
      sensorId,
      userId
    ]
  });
  if (readableResults.length === 0) {
    return false;
  }
  return true;
};

/**
 * Fetches the shares for a sensor (excluding profiles from owner id)
 *
 * @param {*} sensor
 * @param {*} ownerId
 * @returns
 */
const getShares = async (sensor) => {
  let existingShares = [];
  try {
    // Notify any sharees
    existingShares = await mysql.query({
      sql: `SELECT
                    sensor_profiles.user_id AS user_id,
                    users.email AS email,
                    sensor_profiles.name AS name
                  FROM sensor_profiles
                  INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                  INNER JOIN users ON users.id = sensor_profiles.user_id
                  WHERE
                        sensor_profiles.sensor_id = ?
                        AND sensor_profiles.user_id != sensors.owner_id`,
      timeout: 1000,
      values: [sensor]
    });
  } catch (e) {
    console.error('Failed to fetch sensor shares', e);
    return [];
  }
  return existingShares;
};

/**
 * Removes sensor profiles for a sensor
 *
 * @param {*} sensor
 * @param {*} ownerId Optionally scope to owner for extra security
 * @returns Returns the amount of profiles removed
 */
const removeSensorProfiles = async (sensor, ownerId = null) => {
  let userClause = '';
  const sqlValues = [sensor];
  if (ownerId !== null) {
    userClause = 'AND sensors.owner_id = ?';
    sqlValues.push(ownerId);
  }

  // Remove profiles
  let profileResult = { affectedRows: 0 };
  try {
    profileResult = await mysql.query({
      sql: `DELETE sensor_profiles
                FROM sensor_profiles
                INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                WHERE
                    sensor_profiles.sensor_id = ?
                    ${userClause}`,
      timeout: 1000,
      values: sqlValues
    });
  } catch (e) {
    console.error('Failed to delete sensor profiles', e);
    return -1;
  }

  return profileResult.affectedRows;
};

/**
 * Removes a single sensor profile for a non-owner user
 *
 * @param {*} sensor
 * @param {*} userId User ID (not same as owner) of the sensor
 * @returns Returns the amount of profiles removed
 */
const removeSensorProfileForUser = async (sensor, userId) => {
  // Remove profile
  let profileResult = { affectedRows: 0 };
  try {
    profileResult = await mysql.query({
      sql: `DELETE sensor_profiles
                FROM sensor_profiles
                INNER JOIN sensors ON sensors.sensor_id = sensor_profiles.sensor_id
                WHERE
                    sensor_profiles.user_id = ?
                    AND sensors.owner_id != sensor_profiles.user_id
                    AND sensor_profiles.is_active = 1
                    AND sensors.sensor_id = ?`,
      timeout: 1000,
      values: [userId, sensor]
    });
  } catch (e) {
    console.error('Failed to delete sensor profiles', e);
    return -1;
  }

  return profileResult.affectedRows;
};

/**
 * (Hard) Deletes a sensor
 *
 * @param {*} sensor
 * @param {*} ownerId
 * @returns Amount of sensors removed [0, 1]
 */
const removeSensor = async (sensor, ownerId = null) => {
  let userClause = '';
  const sqlValues = [sensor];
  if (ownerId !== null) {
    userClause = 'AND sensors.owner_id = ?';
    sqlValues.push(ownerId);
  }

  let results = { affectedRows: 0 };
  try {
    results = await mysql.query({
      sql: `DELETE FROM sensors
                WHERE
                    sensor_id = ?
                    ${userClause}`,
      timeout: 1000,
      values: [sensor]
    });
  } catch (e) {
    console.error('Failed to delete sensors', e);
    return -1;
  }

  return results.affectedRows;
};

const query = async (queryObject) => {
  return mysql.query(queryObject);
};

/**
 * Exports
 */
module.exports = {
  fetchAll,
  fetchSingle,
  fetchMultiCondition,
  fetchUserSetting,
  deleteSingle,
  insertSingle,
  fetchCount,
  setValue,
  updateValues,

  fetchAlerts,
  saveAlert,
  deleteAlertsForSensor,

  shareSensor,
  fetchSensorsForUser,
  createPendingShare,
  getPendingShares,
  claimPendingShare,
  getShares,
  removeSensorProfiles,
  removeSensorProfileForUser,
  removeSensor,
  query,
  disconnect,

  canReadSensor
  // canUpdateSensor
};
