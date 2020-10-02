const gatewayHelper = require('../Helpers/gatewayHelper');
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
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const tags = await mysql.query({
        sql: `SELECT
                tag_id AS Tag,
                true AS Owner
            FROM claimed_tags
            WHERE user_id = ?
            UNION
            SELECT
                tag_id AS Tag,
                false AS Owner
            FROM shared_tags
            WHERE user_id = ?`,
        timeout: 1000,
        values: [user.id, user.id]
    });

    return gatewayHelper.successResponse({
        email: user.email,
        tags: tags
    });
}
