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
  
// Main handler function
exports.handler = async (event, context) => {
    const eventBody = JSON.parse(event.body);
    
    const valid = validator.hasKeys(eventBody, ['email']) && validator.validateEmail(eventBody.email);

    if (!valid) {
        return gatewayHelper.invalid();
    }
    
    let results = null;

    const userInfo = {
        email: email,
        accessToken: guidHelper.guid(32)
    };

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

    return gatewayHelper.ok(null, JSON.stringify(userInfo));
}