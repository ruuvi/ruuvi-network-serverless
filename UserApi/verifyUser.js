const gatewayHelper = require('Helpers/gatewayHelper.js');
const validator = require('Helpers/validator.js');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.ENDPOINT,
        database : process.env.DATABASE,
        user     : process.env.USERNAME,
        password : process.env.PASSWORD
    }
})

// Main handler function
exports.handler = async (event, context) => {
    if (
        !validator.hasKeys(event.queryStringParameters, ['token'])
        || !validator.validateToken(event.queryStringParameters.token)
    ) {
        return gatewayHelper.forbidden();
    }
    
    // Run your query
    let results = await mysql.query(
        `SELECT email
        FROM user_registrations
        WHERE
            token = '${token}'
            AND expiration > CURRENT_TIMESTAMP();`
    );

    if (results.length !== 1) {
        // Expired token
        return gatewayHelper.expired();
    }

    const userInfo = {
        Email: results[0].email,
        AccessToken: guidHelper.guid(32)
    };

    try {
        results = await mysql.query(
            `INSERT INTO users (
                email
            ) VALUES (
                '${userInfo.email}'
            );`
        );

        if (results.insertId) {
            let tokenResult = await mysql.query(
                `INSERT INTO user_tokens (
                    user_id,
                    access_token
                ) VALUES (
                    '${results.insertId},
                    '${userInfo.AccessToken}'
                );`
            );

            if (tokenResult.insertId) {
                console.log("Successfully created token for user: " + userInfo.Email);
            }
        }
      
        await mysql.end();
    } catch (e) {
        // TODO: Consolidate & Unify MySQL + error handling - possibly better done async
        console.error("Unable to insert user: " + userInfo.Email);

        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "Email already exists.");
        }
        
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    await mysql.end();

    return gatewayHelper.successResponse(userInfo);
}