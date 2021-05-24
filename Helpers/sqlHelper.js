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
 * Fetches a row by id column
 *
 * @param {string} field Field name to use for filtering
 * @param {string} value Value to filter by
 * @param {string} table Target table
 * @returns {object} First result or null if none
 */
const fetchSingle = async (field, value, table) => {
    try {
        const result = await mysql.query({
            sql: `SELECT * FROM ${table} WHERE ${field} = ? LIMIT 1`,
            timeout: 1000,
            values: [value]
        });

        if (result.length === 1) {
            return result[0];
        }
    } catch (err) {
        console.error(err);
        return null;
    }
    return null;
}

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
}

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
        orderBy = `ORDER BY ${orderByDirection}`
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
}

/**
 * Sets a single value in the database
 *
 * @param {string} field Field name to set
 * @param {string} value Value to set
 * @param {string} table Target table
 * @param {string} keyField Key field for filtering
 * @param {string} keyValue Value of the key
 * @returns {boolean} True if value changed, false otherwise
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
}

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
    })

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
}

const fetchAlerts = async (sensorId) => {
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
}

/**
 * Gets the alert of a type for a given sensor.
 * 
 * @param {int} userId ID of the user to add the alert
 * @param {string} sensorId ID of the sensor to get the alert for
 * @param {enum} type Type in: ['temperature', 'humidity', 'pressure', 'signal', 'movement']
 * @returns 
 */
 const saveAlert = async (userId, sensorId, type, enabled = true, min = Number.MIN_VALUE, max = Number.MAX_VALUE) => {
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
                    enabled
                ) VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                ) ON DUPLICATE KEY UPDATE
                    min_value = VALUES(min_value),
                    max_value = VALUES(max_value),
                    enabled = VALUES(enabled),
                    triggered = 0;`,
            timeout: 1000,
            values: [userId, sensorId, type, min, max, enabledInt]
        });
    } catch (e) {
        console.error(e);
        return false;
    }
    return res;
}

const shareSensor = async (userId, ownerId, sensor) => {
    let results = await mysql.query({
        sql: `INSERT INTO sensor_profiles (
                user_id,
                sensor_id,
                name,
                picture
            ) SELECT
                ?,
                sensor_id,
                '',
                ''
            FROM sensors
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
}

/**
 * Fetch all sensors for a users.
 * 
 * @param {integer} userId User ID to fetch sensors for.
 * @returns 
 */
const fetchSensorsForUser = async (userId) => {
    const userIdInt = parseInt(userId);
    const sensors = await mysql.query({
        sql: `SELECT
                sensors.sensor_id AS sensor,
                COALESCE(sensor_profiles.name, '') AS name,
                owner.email AS owner,
                COALESCE(sensor_profiles.picture, '') AS picture,
                sensors.public AS public,
                sensors.offset_humidity AS offsetHumidity,
                sensors.offset_temperature AS offsetTemperature,
                sensors.offset_pressure AS offsetPressure
            FROM sensor_profiles
            INNER JOIN sensors ON sensor_profiles.sensor_id = sensors.sensor_id
            INNER JOIN users owner ON owner.id = sensors.owner_id
            WHERE
                sensor_profiles.user_id = ?
                AND sensor_profiles.is_active = 1`,
        timeout: 1000,
        values: [userIdInt, userIdInt]
    });
    return sensors;
}

/**
 * Creates a pending invite for a user.
 * 
 * @param {string} sensor 
 * @param {string} targetEmail 
 * @param {integer} creatorId 
 * @returns 
 */
const createPendingShare = async (sensor, targetEmail, creatorId) => {
    let results = await mysql.query({
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
}

/**
 * Creates a pending invite for a user.
 * 
 * @param {string} sensor 
 * @param {string} targetEmail 
 * @param {integer} creatorId 
 * @returns 
 */
 const claimPendingShare = async (sensor, targetEmail, creatorId) => {
    const shareResult = await shareSensor(userId, share.creator_id, sensor);
    if (shareResult === null) {
        console.log(ownerId + ' failed to claim ' + sensor + ' to ' + targetEmail);
        return null;
    }

    let results = await mysql.query({
        sql: `UPDATE pending_shares
            SET deleted = 1
            WHERE
                sensor_id = ?
                AND email = ?`,
        timeout: 1000,
        values: [targetEmail, sensor, creatorId]
    });

    if (results.insertId) {
        // Success
        console.log(ownerId + ' created pending share of sensor ' + sensor + ' to ' + targetEmail);
    } else {
        console.log(ownerId + ' failed to create a pending share of sensor ' + sensor + ' to ' + targetEmail);
        return null;
    }

    return results;
}

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
            FROM pending_invites
            WHERE
                email = ?
                AND deleted = 0`,
        timeout: 1000,
        values: [targetEmail]
    });
    return sensors;
}

const disconnect = async () => {
    await mysql.end();
}

/**
 * Exports
 */
module.exports = {
	fetchAll,
    fetchSingle,
    deleteSingle,
	setValue,
	updateValues,
    fetchAlerts,
    saveAlert,
    shareSensor,
    fetchSensorsForUser,
    createPendingShare,
    getPendingShares,
    claimPendingShare,
    disconnect
};
