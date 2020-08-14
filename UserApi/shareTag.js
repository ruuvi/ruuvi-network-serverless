const gatewayHelper = require('Helpers/gatewayHelper.js');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('Helpers/authHelper');
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
    const authInfo = event.headers.Authorization;
    const user = await auth.authorizedUser(authInfo);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['tag', 'user'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing tag or user_id");
    }
    
    const tag = eventBody.tag;
    const targetUserEmail = eventBody.user;

    if (!validator.validateEmail(targetUserEmail)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid E-mail given.");
    }

    if (!validator.validateToken(tag)) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid Tag ID given.");
    }

    let results = null;
    
    try {
        const targetUser = await mysql.query(
            `SELECT id
            FROM users
            WHERE email = '${targetUserEmail}'`
        );
        if (targetUser.length === 0) {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "User not found.");
        }
        const targetUserId = targetUser[0].id;

        // Currently Enforces sharing restrictions on database level       
        results = await mysql.query(
            `INSERT INTO shared_tags (
                user_id,
                tag_id
            ) SELECT
                ${targetUserId},
                tag_id
            FROM claimed_tags
            WHERE
                user_id = ${user.id}
                AND user_id != ${targetUserId}
                AND tag_id = '${tag}'`
        );

        if (results.insertId) {
            // Success
        } else {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Unable to share tag.");    
        }
      
        // Run clean up function
        await mysql.end();
    } catch (e) {       
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "Tag already shared to user.");
        }

        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }  

    return gatewayHelper.successResponse({
        tag: tag
    });
}