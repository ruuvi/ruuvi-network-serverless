/**
 * Generates a random string of given length.
 *
 * Note: This could probably be replaced with something like uuid
 *
 * @param int length
 * @param string userId If set, will prefix the token with hex encoded user id + '/'
 */
const create = (length, userId) => {
  const result = {
    token: ''
  };
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  let raw = '';
  for (let i = 0; i < length; i++) {
    raw += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  result.token = raw;

  if (userId) {
    // Create the composite key from user id and the raw token
    const buf = Buffer.from('u' + userId.toString(), 'ascii');
    result.userId = userId;
    result.composite = buf.toString('hex') + '/' + raw;

    // Create the hash
    const saltRounds = 2; // Performance above 4 degrades a lot
    const bcrypt = require('bcryptjs');
    result.hash = bcrypt.hashSync(raw, saltRounds);
  }

  return result;
};

/**
 * Parses userId out if any and returns it with token
 *
 * @param {string} token String token
 * @return {object} token and userId (if any)
 */
const parse = (token) => {
  const ret = {
    token: token
  };
  if (token.indexOf('/') > 0) {
    ret.token = token.substring(token.indexOf('/') + 1);

    const userHex = token.substring(0, token.indexOf('/'));
    const uidStr = Buffer.from(userHex, 'hex').toString();
    if (uidStr.substring(0, 1) !== 'u') {
      // Invalid format
      return ret;
    }
    ret.userId = parseInt(uidStr.substring(1));
  }

  return ret;
};

/**
 * Exports
 */
module.exports = {
  create,
  parse
};
