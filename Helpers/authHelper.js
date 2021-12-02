const validator = require('../Helpers/validator');
const generator = require('../Helpers/tokenGenerator');
const sqlHelper = require('../Helpers/sqlHelper');
const userHelper = require('../Helpers/userHelper');

/**
 * Returns the user id for the authenticated user.
 *
 * @param {string} authHeader Bearer token auth string or token
 */
const authorizedUser = async (headers) => {
  // Due to case-insensitiveness of the headers, this is done the icky way
  let token = null;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      token = value;
      break;
    }
  }

  if (!token) {
    return null;
  } else if (token.length > 7 && token.substring(0, 7) === 'Bearer ') {
    token = token.substring(7);
  }

  if (!validator.validateToken(token)) {
    console.error('Invalid token: ' + token);
    return null;
  }

  // Parse sectioned token
  const parsed = generator.parse(token);
  if (!parsed.userId) {
    return null;
  }

  // Fetch hashed version
  const tokenResult = await sqlHelper.fetchAll('user_id', parsed.userId, 'user_tokens');
  if (!tokenResult || tokenResult.length === 0) {
    await sqlHelper.disconnect();
    return null;
  }

  // Compare tokens
  const bcrypt = require('bcryptjs');

  for (let i = 0; i < tokenResult.length; i++) {
    const token = tokenResult[i].access_token;
    if (bcrypt.compareSync(parsed.token, token)) {
      await userHelper.updateLastAccessed(tokenResult[i].id);
      return await userHelper.getById(parsed.userId);
    }
  }

  return null;
};

/**
 * Validates a given signature for a gateway
 *
 * @param {string} givenSignature Signature to validate
 * @param {mixed} data Request data to validate
 * @param {string} gatewayMacAddress Gateway id to validate
 * @param {integer} timestamp Unix timestamp of the message (as provided in the headers)
 * @param {integer} maxAge Maximum age of the request
 */
const validateGatewaySignature = async (givenSignature, data, gatewayMacAddress, timestamp, maxAge) => {
  if (givenSignature === null || gatewayMacAddress === null || timestamp === null) {
    return false;
  }

  const dynamoHelper = require('../Helpers/dynamoHelper');

  const gatewayData = await dynamoHelper.getGatewayData(gatewayMacAddress);
  if (!gatewayData || gatewayData.length === 0) {
    console.error('Gateway not whitelisted: ' + gatewayMacAddress);
    return false;
  }

  return validateSignature(givenSignature, data, timestamp, maxAge, gatewayData[0].Secret);
};

/**
 * Validates the given signature
 *
 * @param {string} givenSignature Signature to validate
 * @param {mixed} data Payload to validate
 * @param {integer} timestamp Unix Timestamp of the signature
 * @param {integer} maxAge Maximum age of the request
 * @param {string} secret Signing secret
 */
const validateSignature = (givenSignature, data, timestamp, maxAge, secret) => {
  if (givenSignature === null || timestamp === null || secret === null) {
    return false;
  }

  const now = Date.now();
  const tsMs = timestamp * 1000;
  if (now - tsMs > maxAge) {
    const diff = now - tsMs;
    console.error(`Signature expired; diff:${diff}, max-age:${maxAge}, now:${now}, ts:${tsMs}`);
    return false;
  }

  const signature = createSignature(data, secret);
  if (signature !== givenSignature) {
    console.error(`Non-matching signatures: Calculated: ${signature}, Given: ${givenSignature}`);
  }

  return givenSignature === signature;
};

/**
 * Creates a signature for the given payload with the parameters.
 *
 * @param {mixed} data String or array representing the payload
 * @param {string} nonce Random nonce
 * @param {integer} timestamp Unix timestamp integer
 * @param {string} secret Signing secret
 */
const createSignature = (data, secret) => {
  let dataStr = data;
  if (typeof data !== 'string') {
    dataStr = JSON.stringify(data);
  }

  const signatureBody = dataStr;

  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret)
    .update(signatureBody)
    .digest('hex');
};

module.exports = {
  /* User */
  authorizedUser,

  /* Signature */
  validateSignature,
  createSignature,

  /* Gateway Signature */
  validateGatewaySignature
};
