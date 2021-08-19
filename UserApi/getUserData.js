const gatewayHelper = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const sqlHelper = require('../Helpers/sqlHelper');

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

    const sensors = await sqlHelper.fetchSensorsForUser(user.id);

    await sqlHelper.disconnect();

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
