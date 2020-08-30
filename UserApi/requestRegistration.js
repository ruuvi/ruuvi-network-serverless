const guidHelper = require('Helpers/guidHelper');
const gatewayHelper = require('Helpers/gatewayHelper.js');
const emailHelper = require('Helpers/emailHelper');
const validator = require('Helpers/validator');


const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.ENDPOINT,
        database : process.env.DATABASE,
        user     : process.env.USERNAME,
        password : process.env.PASSWORD
    }
});

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return gatewayHelper.ok();
    }
    const eventBody = JSON.parse(event.body);

    const valid = validator.hasKeys(eventBody, ['email']) && validator.validateEmail(eventBody.email);
    const isReset = eventBody.hasOwnProperty('reset') && eventBody.reset === 1;

    if (!valid) {
        return gatewayHelper.invalid();
    }

    let results = null;

    const userInfo = {
        email: eventBody.email,
        verificationToken: guidHelper.guid(32),
        expirationTime: process.env.INVITATION_EXPIRATION_INTERVAL,
        type: isReset ? 'reset' : 'registration'
    };

    try {
        const existingRequest = await mysql.query(
            `SELECT
                type
            FROM user_registrations
            WHERE
                email = '${userInfo.email}'
                AND last_attempt > CURRENT_TIMESTAMP - INTERVAL 5 MINUTE
                AND completed = 0
                AND type = '${userInfo.type}'`
        );

        if (existingRequest.length > 0) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.THROTTLED, "Please wait a few minutes before trying again.");
        }

        // For completed 'reset' requests, reset the link to the most recent one.
        results = await mysql.query(
            `INSERT INTO user_registrations (
                email,
                token,
                expires,
                type
            ) VALUES (
                '${userInfo.email}',
                '${userInfo.verificationToken}',
                CURRENT_TIMESTAMP + INTERVAL ${userInfo.expirationTime} MINUTE,
                '${userInfo.type}'
            ) ON DUPLICATE KEY UPDATE
                expires = IF(completed = 1 AND type = "registration", expires, VALUES(expires)),
                token = IF(completed = 1 AND type = "registration", token, VALUES(token)),
                completed = IF(completed = 1 AND type = "reset", 0, completed),
                last_attempt = IF(completed = 1 AND type = "reset", CURRENT_TIMESTAMP, last_attempt);`
        );

        // Attempted to update completed link
        if (results.insertId === 0 & results.affectedRows === 1) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.EXPIRED, "Link expired or used.");
        }

        if (results.insertId) {
            let emailResult = {};
            if (userInfo.type === 'registration') {
                emailResult = await emailHelper.sendEmailVerification(userInfo.email, userInfo.verificationToken, process.env.SOURCE_EMAIL);
            } else if (userInfo.type === 'reset') {
                emailResult = await emailHelper.sendResetEmail(userInfo.email, userInfo.verificationToken, process.env.SOURCE_EMAIL);
            }
            if (!emailResult.hasOwnProperty("MessageId")) {
                throw new Error("Error sending e-mail: " + emailResult);
            }
        }

        await mysql.end();
    } catch (e) {
        // Conflict
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "E-mail already exists.");
        }
        console.error("Error creating registration request: " + e.error);
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse({
        email: userInfo.email
    });
}
