const gatewayHelper = require('Helpers/gatewayHelper.js');
const { HTTPCodes } = require('../Helpers/gatewayHelper');

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
        return gatewayHelper.forbidden();
    }

    if (!eventBody.hasOwnProperty('tag')) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing tag");
    }
    
    const tag = eventBody.tag;

    let results = null;
    
    try {
        results = await mysql.query(
            `INSERT IGNORE INTO claimed_tags (
                user_id,
                tag_id
            ) SELECT
                user_id, 
                "${tag}"
            FROM user_tokens
            WHERE access_token = "${accessToken}"`
        );

        if (results.insertId) {
            // Success
        }
      
        // Run clean up function
        await mysql.end();
    } catch (e) {       
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "Tag already claimed.");
        }

        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }  

    return gatewayHelper.successResponse({
        Tag: tag
    });
}