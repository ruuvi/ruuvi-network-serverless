const gatewayHelper = require('../Helpers/gatewayHelper');
const dynamoHelper = require('../Helpers/dynamoHelper');
const validator = require('../Helpers/validator');
const auth = require('../Helpers/authHelper');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

exports.handler = async (event, context) => {
    // Authorization
    let user = null;
    if (process.env.REQUIRE_LOGIN == 1) {
        user = await auth.authorizedUser(event.headers);
        if (!user) {
            return gatewayHelper.unauthorizedResponse();
        }
    }

    const query = event.queryStringParameters;

    // Validation
    if (
        !query
        || !query.hasOwnProperty('tag')
        || !validator.validateToken(query.tag)) {

        // Invalid request
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid request format.');
    }

    let sinceTime = null;
    let untilTime = null;

    if (query.hasOwnProperty('since') && parseInt(query.since)) {
        sinceTime = parseInt(query.since);
    }
    if (query.hasOwnProperty('until') && parseInt(query.until)) {
        untilTime = parseInt(query.until);
    }

    const tag = query.tag;

    if (user) {
        const hasClaim = await mysql.query(
            `SELECT claim_id
            FROM claimed_tags
            WHERE
                user_id = ${user.id}
                AND tag_id = '${tag}'
            UNION
            SELECT share_id
            FROM shared_tags
            WHERE
                user_id = ${user.id}
                AND tag_id = '${tag}'`
        );
        if (hasClaim.length === 0) {
            return gatewayHelper.forbiddenResponse();
        }
    }

    const dataPoints = await dynamoHelper.getSensorData(tag, process.env.DEFAULT_RESULTS, sinceTime, untilTime);
    if (dataPoints.length === 0) {
        // Not found
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Not found.");
    }

    return gatewayHelper.successResponse({
        sensor: tag,
        total: dataPoints.length,
        measurements: dataPoints
    });
};
