const gatewayHelper = require('Helpers/gatewayHelper');
const validator = require('Helpers/validator');
const guidHelper = require('Helpers/guidHelper');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.ENDPOINT,
        database : process.env.DATABASE,
        user     : process.env.USERNAME,
        password : process.env.PASSWORD
    }
});

exports.handler = async (event, context) => {
    if (
        !validator.hasKeys(event.queryStringParameters, ['token'])
        || !validator.validateToken(event.queryStringParameters.token)
    ) {
        return gatewayHelper.forbidden();
    }
    
    const token = event.queryStringParameters.token;

    let results = await mysql.query(
        `SELECT
            email,
            completed,
            type
        FROM user_registrations
        WHERE
            token = '${token}'
            AND expires > CURRENT_TIMESTAMP();`
    );

    if (results.length !== 1) {
        // Expired token
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.EXPIRED, "Provided token is invalid or expired.");
    } else if (results[0].completed === 1) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "Provided token has already been used.");
    }
    const isReset = results[0].type === 'reset';

    const userInfo = {
        email: results[0].email,
        accessToken: guidHelper.guid(32)
    };

    try {
        let userId = 0;
        if (!isReset) {
            results = await mysql.query(
                `INSERT INTO users (
                    email
                ) VALUES (
                    '${userInfo.email}'
                );`
            );
            userId = results.insertId;
        } else {
            results = await mysql.query(
                `SELECT id
                FROM users
                WHERE email = '${userInfo.email}'
                LIMIT 1;`
            );
            if (results.length === 1) {
                userId = results[0].id;
            }
        }

        if (userId > 0) {
            let tokenResult = await mysql.query(
                `INSERT INTO user_tokens (
                    user_id,
                    access_token
                ) VALUES (
                    ${userId},
                    '${userInfo.accessToken}'
                );`
            );

            if (tokenResult.insertId) {
                console.info("Successfully created token for user: " + userInfo.email);
            }
        }

        // Update the request(s) as closed for this e-mail address.
        let registrationResult = await mysql.query(
            `UPDATE user_registrations
            SET completed = 1
            WHERE email = '${userInfo.email}';`
        );
        if (registrationResult.affectedRows !== 1) {
            console.error("Unable to set registration row as completed for " + userInfo.email);
        }
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "User already exists.");
        }
        console.error(e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    await mysql.end();

    return gatewayHelper.successResponse(userInfo);
}