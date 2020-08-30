const validator = require('Helpers/validator');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.ENDPOINT,
        database : process.env.DATABASE,
        user     : process.env.USERNAME,
        password : process.env.PASSWORD
    }
});

/**
 * Returns the user id for the authenticated user.
 *
 * @param {string} authHeader Bearer token auth string or token
 */
const authorizedUser = async (headers) => {
    // Due to case-insensitiveness of the headers, this is done the icky way
    let token = null;
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === 'authorization') {
            token = value;
            break;
        }
    }

    if (!token) {
        return null;
    } else if (token.length > 7 && token.substring(0, 7) === 'Bearer ') {
        token = token.substring(7);
    }

    if (!validator.validateToken(token)) {
        console.error("Invalid token: " + token);
        return null;
    }

    let results = await mysql.query(
        `SELECT users.*
        FROM users
        INNER JOIN user_tokens ut ON ut.user_id = users.id
        WHERE ut.access_token = '${token}'
        LIMIT 1;`
    );

    if (results.length === 0) {
        return null;
    }
    return results[0];
};

module.exports = {
    authorizedUser
}
