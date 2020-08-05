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
        'SELECT email FROM user_registrations WHERE token = "' + token + '" AND expiration > CURRENT_TIMESTAMP();'
    );

    if (results.length !== 1) {
        // Expired token
        return gatewayHelper.expired();
    }

    const email = results[0].email;

    try {
        results = await mysql.query(
            "INSERT INTO users (email) VALUES ('" + email + "');"
        );

        if (results.insertId) {
            let tokenResult = await mysql.query(
                "INSERT INTO user_tokens (user_id, access_token) VALUES (" + results.insertId + ", '" + userInfo.accessToken + "');"
            );
        }
      
        await mysql.end();
    } catch (e) {
        // TODO: Consolidate & Unify MySQL + error handling - possibly better done async
        console.error("Unable to insert user: " + email);

        let errorCode = 500;

        let errorResponse = {
            "result": "error",
            "error": "Unknown error occurred."
        };
        
        if (e.code === 'ER_DUP_ENTRY') {
            errorCode = 409; // Conflict
            errorResponse.error = "E-mail already exists.";
        }
        
        return gatewayHelper.response(errorCode, null, JSON.stringify(errorResponse));
    }

    await mysql.end();

    return results;
}