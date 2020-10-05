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
 * Fetches all rows by filtered column
 *
 * @param {string} field Field name to use for filtering
 * @param {string} value Value to filter by
 * @param {string} table Target table
 * @returns {object} First result or null if none
 */
const fetchAll = async (field, value, table) => {
    try {
        const results = await mysql.query({
            sql: `SELECT * FROM ${table} WHERE ${field} = ?`,
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
 * Exports
 */
module.exports = {
	fetchAll,
	fetchSingle,
	setValue
 };
