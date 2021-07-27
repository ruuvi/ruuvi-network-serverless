const sqlHelper = require('../Helpers/sqlHelper');

/**
 * Serves a single file for Apple file validation.
 */
exports.handler = async (event, context) => {
	const maxDays = parseInt(process.env.MAX_TOKEN_AGE) ? parseInt(process.env.MAX_TOKEN_AGE) : 180;

	try {
		const result = await sqlHelper.query({
			sql: `DELETE FROM user_tokens WHERE last_accessed < CURRENT_TIMESTAMP - INTERVAL ? DAY`,
			timeout: 1000,
			values: [maxDays]
		});
		console.log(result.affectedRows + " tokens cleaned up.");
	} catch (e) {
		console.log(e);
		return {
			result: 'Token clean up failed.'
		};
	}

	await sqlHelper.disconnect();

	return {
		result: 'Action performed.'
	};
}
