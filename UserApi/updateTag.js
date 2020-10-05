const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

/**
 * Updates tag profile (currently name)
 *
 * @param {object} event
 * @param {object} context
 */
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

	let name = null;

	if (validator.hasKeys(eventBody, ['name']) && eventBody.name) {
		name = eventBody.name;
	}

	try {
        results = await mysql.query({
			sql: `UPDATE tags SET name = ? WHERE tag_id = ? AND owner_id = ?`,
            timeout: 1000,
            values: [name, tag, user.id]
        });
		if (results.affectedRows !== 1) {
			return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, "Tag not claimed or found. Data not updated.");
		}
        await mysql.end();
    } catch (e) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse({
        name: name
    });
}
