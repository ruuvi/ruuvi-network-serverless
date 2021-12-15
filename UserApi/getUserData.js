const gatewayHelper = require('../Helpers/gatewayHelper');

const { wrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => wrapper(executeGetUserData, event, context);

const executeGetUserData = async (event, context, sqlHelper, user) => {
  const sensors = await sqlHelper.fetchSensorsForUser(user.id);

  // Format returned data properly
  const formatted = [];
  sensors.forEach((sensor) => {
    sensor.public = !!sensor.public;
    formatted.push(sensor);
  });

  return gatewayHelper.successResponse({
    email: user.email,
    sensors: formatted
  });
};
