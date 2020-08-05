const gatewayHelper = require('Helpers/gatewayHelper.js');

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
    const accessToken = event.headers.authorization;
    const eventBody = JSON.parse(event.body);
    
    // Access token validation
    if (accessToken.length < 10) {
        // TODO: Length validation is not enough
        return gatewayHelper.response(403);
    }

    if (!eventBody.hasOwnProperty('tag')) {
        return gatewayHelper.response(400, null, '{"result":"error","error":"Missing tag"}');
    }
    
    const  tag = eventBody.tag;

    let results = null;
    
    try {
        results = await mysql.query(
            'INSERT IGNORE INTO claimed_tags (user_id, tag_id) SELECT user_id, "' + tag + '" FROM user_tokens WHERE access_token = "' + accessToken + '"'
        );

        if (results.insertId) {
            // Success
        }
      
        // Run clean up function
        await mysql.end();
    } catch (e) {
        // TODO: Consolidate & Unify MySQL + error handling - possibly better done async
        console.error("Unable to claim tag: " + e.error);

        let errorCode = 500;

        let errorResponse = {
            "result": "error",
            "error": "Unknown error occurred."
        };
        
        if (e.code === 'ER_DUP_ENTRY') {
            errorCode = 409; // Conflict
            errorResponse.error = "Tag already claimed.";
        }
        
        return gatewayHelper.response(errorCode, null, JSON.stringify(errorResponse));
    }  

    return gatewayHelper.response(200, null, JSON.stringify(userInfo));
}