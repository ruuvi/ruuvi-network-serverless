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
        timeout: 1000,
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
                    1
                ) ON DUPLICATE KEY UPDATE
                    min_value = VALUES(min_value),
                    max_value = VALUES(max_value),
                    enabled = VALUES(enabled),
                    triggered = 0;`,
            timeout: 1000,
            values: [userId, sensorId, type, min, max, enabled]
        });
    } catch (e) {
        console.error(e);
        return false;
    }
    return res;
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
    saveAlert
};
