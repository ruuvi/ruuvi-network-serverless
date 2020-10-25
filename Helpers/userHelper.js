const mysqlHelper = require('../Helpers/sqlHelper');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

/**
 * Fetches a user by e-mail
 *
 * @param {string} email E-mail address of the fetched user
 */
const getByEmail = async (email) => {
    const validator = require('../Helpers/validator');
    if (!validator.validateEmail(email)) {
        return null;
    }

    return await mysqlHelper.fetchSingle('email', email, 'users');
}

/**
 * Fetches a user by id
 *
 * @param {int} id ID of the fetched user
 */
const getById = async (id) => {
    const idInt = parseInt(id);
    if (!idInt) {
        return null;
    }

    return await mysqlHelper.fetchSingle('id', idInt, 'users');
}

/**
 * Create user by e-mail
 *
 * @param {string} email Email of the created user
 */
const create = async (email) => {
    const validator = require('../Helpers/validator');
    if (!validator.validateEmail(email)) {
        return null;
    }

    try {
        results = await mysql.query({
            sql: `INSERT INTO users (email) VALUES (?);`,
            timeout: 1000,
            values: [email]
        });
        return results.insertId;
    } catch (err) {
        console.error(err);
        return null;
    }
}

/**
 * Create user token for user
 *
 * @param {int} userId ID of the user
 * @param {string} token Token to store
 */
const createToken = async (userId) => {
    const idInt = parseInt(userId);
    if (!idInt) {
        return null;
    }

    // Generate new token
    const tokenGenerator = require('./tokenGenerator');
    const tokenData = tokenGenerator.create(64, userId);

    // Hash the token
    const saltRounds = 10;
    const bcrypt = require('bcrypt');
    const hash = bcrypt.hashSync(tokenData.token, saltRounds);

    try {
        results = await mysql.query({
            sql: `INSERT INTO user_tokens (user_id, access_token) VALUES (?, ?);`,
            timeout: 1000,
            values: [idInt, hash]
        });

        return tokenData.composite;
    } catch (err) {
        console.error(err);
        return null;
    }
}

const createSubscription = async (userId) => {
    const idInt = parseInt(userId);
    if (!idInt) {
        return;
    }

    try {
        results = await mysql.query({
            sql: `INSERT INTO subscriptions (user_id) VALUES (?);`,
            timeout: 1000,
            values: [idInt]
        });
    } catch (err) {
        console.error(err);
    }
}

/**
 * Exports
 */
module.exports = {
    getByEmail,
    getById,
    create,
    createToken,
    createSubscription
 };
