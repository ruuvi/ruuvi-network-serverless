const gatewayHelper = require('Helpers/gatewayHelper');
const auth = require('Helpers/authHelper');

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

    const tags = await mysql.query(
        `SELECT
            tag_id AS Tag,
            true AS Owner
        FROM claimed_tags
        WHERE user_id = ${user.id}
        UNION
        SELECT
            tag_id AS Tag,
            false AS Owner
        FROM shared_tags
        WHERE user_id = ${user.id}`
    );

    return gatewayHelper.successResponse({
        email: user.email,
        tags: tags
    });
}
