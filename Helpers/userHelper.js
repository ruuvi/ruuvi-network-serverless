const mysqlHelper = require('../Helpers/sqlHelper');

/**
 * Fetches a user by e-mail
 *
 * @param {string} email E-mail address of the fetched user
 */
const getByEmail = async (email) => {
  const validator = require('../Helpers/validator');
  if (!validator.validateEmail(email)) {
    return null;
  }

  return await mysqlHelper.fetchSingle('email', email, 'users');
};

/**
 * Fetches a user by id
 *
 * @param {int} id ID of the fetched user
 */
const getById = async (id) => {
  const idInt = parseInt(id);
  if (!idInt) {
    return null;
  }

  return await mysqlHelper.fetchSingle('id', idInt, 'users');
};

/**
 * Create user by e-mail
 *
 * @param {string} email Email of the created user
 */
const create = async (email) => {
  const validator = require('../Helpers/validator');
  if (!validator.validateEmail(email)) {
    return null;
  }

  try {
    const results = await mysqlHelper.insertSingle({
      email: email
    }, 'users');
    return results.insertId;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Create user token for user
 *
 * @param {int} userId ID of the user
 * @param {string} token Token to store
 */
const createUserToken = async (userId) => {
  const idInt = parseInt(userId);
  if (!idInt) {
    return null;
  }

  // Generate new token
  const tokenGenerator = require('./tokenGenerator');
  const tokenData = tokenGenerator.create(64, userId);

  try {
    await mysqlHelper.insertSingle({
      user_id: idInt,
      access_token: tokenData.hash
    }, 'user_tokens');

    return tokenData.composite;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Updates the token ids last accessed flag.
 *
 * @param {int} tokenId
 */
const updateLastAccessed = async (tokenId) => {
  const idInt = parseInt(tokenId);
  if (!idInt) {
    return;
  }

  try {
    await mysqlHelper.query({
      sql: 'UPDATE user_tokens SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?;',
      timeout: 1000,
      values: [idInt]
    });
  } catch (err) {
    console.error(err);
  }
};

const createSubscription = async (userId) => {
  const idInt = parseInt(userId);
  if (!idInt) {
    return;
  }

  try {
    await mysqlHelper.insertSingle({
      user_id: idInt
    }, 'subscriptions');
  } catch (err) {
    console.error(err);
  }
};

const sendInvitation = async (toEmail, fromEmail, sensorName) => {
  const emailHelper = require('../Helpers/emailHelper');
  return await emailHelper.sendEmailInvitation(toEmail, fromEmail, sensorName || '<<Unnamed>>');
};

/**
 * Exports
 */
module.exports = {
  getByEmail,
  getById,
  create,
  createUserToken,
  createSubscription,
  updateLastAccessed,
  sendInvitation
};
