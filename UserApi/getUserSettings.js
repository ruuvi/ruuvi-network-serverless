const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const errorCodes = require('../Helpers/errorCodes.js');

const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeGetUserSettings, event, context);

const executeGetUserSettings = async (event, context, sqlHelper) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    let settings = null;
    
    try {
        settings = await sqlHelper.query({
            sql: `SELECT \`key\`, \`value\`
                FROM user_settings
                INNER JOIN users ON users.id = user_settings.user_id
                WHERE
                    user_settings.user_id = ?`,
            timeout: 1000,
            values: [user.id]
        });
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
