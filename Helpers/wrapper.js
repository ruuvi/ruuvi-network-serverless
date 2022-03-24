const gatewayHelper = require('../Helpers/gatewayHelper');
const sqlHelper = require('../Helpers/sqlHelper');
const errorCodes = require('../Helpers/errorCodes');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');

/**
 * Wraps the function to perform connection management in a centralized way.
 *
 * @param {*} func Function to be executed
 * @param {*} event Lambda event
 * @param {*} context Lambda context
 * @returns
 */
const userWrapper = async (func, event, context, requireAuth = true) => {
  // Auth
  let user = null;
  if (requireAuth) {
    user = await auth.authorizedUser(event.headers);
    if (!user) {
      await sqlHelper.disconnect();
      return gatewayHelper.unauthorizedResponse();
    }
  }

  let result = null;
  try {
    result = await func(event, context, sqlHelper, user);
  } catch (e) {
    console.error('Unknown error in handler', e);
    result = gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Very Unknown error occurred.', errorCodes.ER_INTERNAL);
  }

  await sqlHelper.disconnect();
  return result;
};

/**
 * Wraps the gatewayApi to perform exception management and auth in a centralized way.
 *
 * @param {*} func Function to be executed
 * @param {*} event Lambda event
 * @param {*} context Lambda context
 * @returns
 */
const gatewayWrapper = async (func, event, context, requireAuth = true) => {
  let result = null;
  try {
    if (requireAuth) {
      // Signature
      const signature = gatewayHelper.getHeader(process.env.SIGNATURE_HEADER_NAME, event.headers);
      const eventBody = JSON.parse(event.body);
      const data = eventBody.data;
      const timestamp = data.timestamp;

      if (!validator.validateAll(data, [
        { name: 'gw_mac', type: 'MAC', required: true },
        { name: 'timestamp', type: 'INT', required: true }
      ])) {
        return gatewayHelper.invalid();
      }

      const validationResult = await auth.validateGatewaySignature(
        signature,
        event.body,
        data.gw_mac,
        timestamp,
        process.env.GATEWAY_REQUEST_TTL
      );

      if (!validationResult) {
        const redis = require('../Helpers/redisHelper').getClient();

        // Log Invalid Signature to Redis for Validation
        const ttl = 60 * 60 * 24 * 3; // 3 days
        await redis.set('invalid_signature_' + data.gw_mac.toUpperCase(), validator.now(), 'EX', ttl);

        console.error(`${data.gw_mac} - Invalid signature: ${signature}`);
        if (parseInt(process.env.ENFORCE_SIGNATURE) === 1) {
          return gatewayHelper.unauthorizedResponse();
        } else {
          console.warn('Not enforcing signature');
        }
      }
    }
  } catch (e) {
    console.error('Unknown error in validation', e);
    result = gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Error in signature validation', errorCodes.ER_INTERNAL);
  }

  try {
    result = await func(event, context);
  } catch (e) {
    console.error('Unknown error in handler', e);
    result = gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Very Unknown error occurred.', errorCodes.ER_INTERNAL);
  }

  return result;
};

module.exports = {
  userWrapper,
  gatewayWrapper
};
