const validator = require('Helpers/validator');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
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

const validateSignature = (signature, gatewayId, timestamp) => {
    const crypto = require('crypto');

    const secret = 'abcdefg';
    const hash = crypto.createHmac('sha256', secret)
        .update('I love cupcakes')
        .digest('hex');

    return signature === hash
}

module.exports = {
    authorizedUser,
    validateSignature
}
