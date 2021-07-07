const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const errorCodes = require('../Helpers/errorCodes.js');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD,
        charset  : 'utf8mb4'
    }
});

exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    let settings = null;
    
    try {
        settings = await mysql.query({
            sql: `SELECT \`key\`, \`value\`
                FROM user_settings
                INNER JOIN users ON users.id = user_settings.user_id
                WHERE
                    user_settings.user_id = ?`,
            timeout: 1000,
            values: [user.id]
        });

        await mysql.end();
    } catch (e) {
        return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, 'Error fetching user metadata.', errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }

    // Format returned data properly
    let formatted = {};
    settings.forEach((setting) => {
        formatted[setting.key] = setting.value;
    }); 

    return gatewayHelper.successResponse({
        settings: formatted
    });
}
