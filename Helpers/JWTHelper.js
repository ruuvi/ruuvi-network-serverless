const tokenGenerator = require('../Helpers/tokenGenerator');
const sqlHelper = require('../Helpers/sqlHelper');

/**
 * Creates a symmetric JWT for the given data.
 *
 * @param payload Payload object (will be json encoded)
 * @param secret Secret to use for signing
 * @param ttl Time to live in seconds
 */
const sign = (payload, secret, ttl) => {
  const jwt = require('jsonwebtoken');

  const time = Math.floor(+new Date() / 1000);
  const token = jwt.sign({
    exp: time + ttl,
    iat: time,
    data: payload
  }, secret);

  return token;
};

/**
 * Verifies a symmetric JWT token with a given secret
 *
 * @param {string} token JWT Token
 * @param {secret} secret Secret to decrypt with
 */
const verify = (token, secret) => {
  const jwt = require('jsonwebtoken');

  try {
    const decrypted = jwt.verify(token, secret);

    const time = Math.floor(+new Date() / 1000);

    if (!decrypted.iat || decrypted.iat > time) {
      return false;
    }

    if (!decrypted.exp || decrypted.exp < time) {
      return false;
    }

    if (!decrypted.data) {
      return false;
    }

    return decrypted.data;
  } catch (e) {
    return false;
  }
};

/**
 * Creates a registration token with given metadata including possibly granting access to some sensors on sign up.
 *
 * @param {string} targetEmail
 * @param {string} registrationType reset|registration
 * @param {array} inviteToSensors array of sensor ids to invite to
 */
const createRegistrationJWT = async (targetEmail, registrationType, expirationTime = null, inviteToSensors = null) => {
  const userInfo = {
    email: targetEmail,
    type: registrationType
  };
  if (inviteToSensors !== null) {
    userInfo.sensors = inviteToSensors;
  }

  const expireMinutes = expirationTime === null ? process.env.INVITATION_EXPIRATION_INTERVAL * 60 : expirationTime * 60;
  const jwt = sign(userInfo, process.env.SIGNING_SECRET, expireMinutes);

  const tokenData = tokenGenerator.create(process.env.VERIFICATION_SHORT_TOKEN_LENGTH);
  const short = tokenData.token.toUpperCase();

  const result = await sqlHelper.insertSingle({
    short_token: short,
    long_token: jwt
  }, 'reset_tokens');

  if (!result.insertId) {
    return null;
  }

  return short;
};

/**
 * Exports
 */
module.exports = {
  sign,
  verify,
  createRegistrationJWT
};
