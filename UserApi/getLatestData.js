const gatewayHelper = require('../Helpers/gatewayHelper');
const dynamoHelper = require('../Helpers/dynamoHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes');
const { userWrapper } = require('../Helpers/wrapper');

exports.handler = async (event, context) => userWrapper(executeGetLatestData, event, context);

const executeGetLatestData = async (event, context, sqlHelper, user) => {
  // FIND USER_ID

  // SELECT SENSOR_ID FROM sensors WHERE sensors.owner_id = users.user_id

  // BATCH QUERY DYNAMO DB for latest measurement of each SENSOR_ID

  // Format response into JSON
  const response = { ok: 'yes' };

  // Send response
  return gatewayHelper.successResponse(response);
};
