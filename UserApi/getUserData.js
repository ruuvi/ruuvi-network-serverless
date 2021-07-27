const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');

const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeGetUserData, event, context);

const executeGetUserData = async (event, context, sqlHelper) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const sensors = await sqlHelper.fetchSensorsForUser(user.id);

    // Format returned data properly
    let formatted = [];
    sensors.forEach((sensor) => {
        sensor.public = sensor.public ? true : false;
        formatted.push(sensor);
    });

    return gatewayHelper.successResponse({
        email: user.email,
        sensors: formatted
    });
}
