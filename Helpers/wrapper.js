const gatewayHelper = require('../Helpers/gatewayHelper');
const sqlHelper = require('../Helpers/sqlHelper');
const errorCodes = require('../Helpers/errorCodes');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const redis = require('../Helpers/redisHelper').getClient();

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
    console.error('Unknown error in user handler', e);
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
        const gwMac = data.gw_mac.toUpperCase();

        // Log Invalid Signature to Redis for Validation
        const ttl = 60 * 60 * 24 * 3; // 3 days
        const keyString = 'invalid_signature_' + gwMac;
        const timestring = validator.now().toString();
        const redisResult = await redis.set(keyString, timestring, 'EX', ttl);
        if (redisResult !== 'OK') {
          console.error(`REDIS failed to store timestamp, result was ${redisResult}`);
        } else {
          console.info(`${gwMac} - Invalid signature: ${signature}, Logging timestamp ${timestring} with key ${keyString}`);
        }
        // Check signature if signature is present, or if it is enforced to be present
        if (parseInt(process.env.ENFORCE_SIGNATURE) === 1 || signature !== null) {
          return gatewayHelper.unauthorizedResponse();
        } else {
          console.warn('Not enforcing signature');
        }
      }
    }
  } catch (e) {
    console.warn('Unknown error in validation', e);
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Error in signature validation', errorCodes.ER_INTERNAL);
  }

  try {
    result = await func(event, context);
  } catch (e) {
    console.error('Unknown error in gateway handler', e);
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Very Unknown error occurred.', errorCodes.ER_INTERNAL);
  }

  return result;
};

/**
 *
 * Lambda treats a batch as a complete success if you return any of the following:
 *  An empty batchItemFailure list
 *  A null batchItemFailure list
 *  An empty EventResponse
 *  A null EventResponse
 * https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html#services-kinesis-batchfailurereporting
*/
const kinesisSuccessResponse =
{
  batchItemFailures: []
};

/**
 *
 * Lambda treats a batch as a complete failure if you return any of the following:
 *  An empty string itemIdentifier
 *  A null itemIdentifier
 *  An itemIdentifier with a bad key name
 * https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html#services-kinesis-batchfailurereporting
*/
const kinesisErrorResponse =
{
  batchItemFailures: [
    {
      itemIdentifier: ''
    }
  ]
};

/**
 * Wraps the internal API to perform exception management a centralized way.
 *
 * @param {*} func Function to be executed, must return true on success and false on failure
 * @param {*} event Lambda event
 * @return kinesis complete success response on successful execution of func,
 *         kinesis complete failure response if func throws exception or returns false.
 */
const kinesisWrapper = async (func, event) => {
  let result = false;

  try {
    result = await func(event);
  } catch (e) {
    console.error('Unknown error in internal handler', e);
    result = false;
  }

  if (result) {
    return kinesisSuccessResponse;
  }
  return kinesisErrorResponse;
};

module.exports = {
  userWrapper,
  gatewayWrapper,
  kinesisWrapper
};
