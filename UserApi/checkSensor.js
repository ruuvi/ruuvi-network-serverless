const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes');
const emailHelper = require('../Helpers/emailHelper');
const userWrapper = require('../Helpers/wrapper').userWrapper;

exports.handler = async (event, context) => userWrapper(executeCheck, event, context);

const executeCheck = async (event, context, sqlHelper, user) => {
  const query = event.queryStringParameters;

  if (!query || !validator.hasKeys(query, ['sensor']) || !validator.validateMacAddress(query.sensor)) {
    console.log('Invalid Sensor: ' + query.sensor);
    return gatewayHelper.errorResponse(HTTPCodes.INVALID, 'Missing or invalid sensor given', errorCodes.ER_MISSING_ARGUMENT);
  }

  const sensor = query.sensor;
  const checkRes = await sqlHelper.fetchSingle('sensor_id', sensor, 'sensors');
  let ownerEmail = '';

  if (checkRes !== null) {
    const claimerUserRes = await sqlHelper.fetchSingle('id', checkRes.owner_id, 'users');
    if (claimerUserRes !== null) {
      ownerEmail = emailHelper.maskEmail(claimerUserRes.email);
    }
  }

  return gatewayHelper.successResponse({
    email: ownerEmail
  });
};
