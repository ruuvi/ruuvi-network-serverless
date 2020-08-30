const gatewayHelper = require('Helpers/gatewayHelper');
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
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !validator.hasKeys(eventBody, ['tag'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing tag");
    }

    const tag = eventBody.tag;

    let results = null;

    try {
        results = await mysql.query(
            `INSERT INTO claimed_tags (
                user_id,
                tag_id
            ) VALUES (
                ${user.id},
                '${tag}'
            );`
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
        tag: tag
    });
}
