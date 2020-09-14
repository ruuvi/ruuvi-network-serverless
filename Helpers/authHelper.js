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

/**
 * Validates a given signature for a gateway
 * 
 * @param {string} givenSignature Signature to validate
 * @param {string} gatewayId Gateway id to validate
 * @param {int} timestamp Unix timestamp of the message (as provided in the headers)
 */
const validateGatewaySignature = async (givenSignature, data, gatewayId, timestamp, maxAge, secret) => {
    if (givenSignature === null || gatewayId === null || timestamp === null) {
        return false;
    }

    const dynamoHelper = require('Helpers/dynamoHelper');

    const gatewayData = await dynamoHelper.getGatewayData(gatewayId);
    if (!gatewayData || gatewayData.length === 0) {
        console.error("Gateway not whitelisted: " + gatewayId);
        return false;
    }

    return validateSignature(givenSignature, data, gatewayData[0].DeviceId, gatewayData[0].DeviceAddr, timestamp, maxAge, secret);
}

/**
 * 
 * @param {string} givenSignature Signature to validate
 * @param {mixed} data Payload to validate
 * @param {string} deviceId Device Id to validate against
 * @param {string} deviceAddr Device Addr to validate against
 * @param {integer} timestamp Unix Timestamp of the signature
 * @param {string} secret Signing secret
 */
const validateSignature = (givenSignature, data, deviceId, deviceAddr, timestamp, maxAge, secret) => {
    if (givenSignature === null || deviceId === null || deviceAddr === null || timestamp === null || secret === null) {
        return false;
    }

    const now = Date.now();
    if (now - timestamp > maxAge) {
        console.error('Old request for ' + deviceId + ': ' + timestamp + ' (now: ' + now + ')');
        return false;
    }

    const signature = createSignature(data, deviceId, deviceAddr, timestamp, secret);

    return givenSignature === signature;
}

/**
 * Creates a signature for the given payload with the parameters.
 * 
 * @param {mixed} data String or array representing the payload
 * @param {string} deviceId Device ID string
 * @param {string} deviceAddr Device Address string
 * @param {integer} timestamp Unix timestamp integer
 * @param {string} secret Signing secret
 */
const createSignature = (data, deviceId, deviceAddr, timestamp, secret) => {
    let dataStr = data;
    if (typeof data !== 'string') {
        dataStr = JSON.stringify(data);
    }

    const signatureBody = deviceAddr + deviceId + timestamp + dataStr;

    const crypto = require('crypto');

    return crypto.createHmac('sha256', secret)
        .update(signatureBody)
        .digest('hex');
}

module.exports = {
    /* User */
    authorizedUser,
    
    /* Signature */
    validateSignature,
    createSignature,

    /* Gateway Signature */
    validateGatewaySignature
}
