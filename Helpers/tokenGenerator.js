/**
 * Generates a random string of given length.
 *
 * Note: This could probably be replaced with something like uuid
 *
 * @param int length
 * @param string userId If set, will prefix the token with hex encoded user id + '/'
 */
const create = (length, userId) => {
    let result = {
       token: ''
    };
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    let raw = '';
    for (var i = 0; i < length; i++) {
        raw += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    result.token = raw;

    if (userId) {
        const buf = Buffer.from('u' + userId.toString(), 'ascii');
        result.userId = userId;
        result.composite = buf.toString('hex') + '/' + raw;
    }

   return result;
}

/**
 * Parses userId out if any and returns it with token
 *
 * @param {string} token String token
 * @return {object} token and userId (if any)
 */
const parse = (token) => {
   let ret = {
      token: token
   };
   if (token.indexOf('/') > 0) {
      ret.token = token.substring(token.indexOf('/') + 1);

      const userHex = token.substring(0, token.indexOf('/') - 1);
      const uidStr = Buffer.from(userHex, 'hex').toString();
      if (uidStr.substring(0, 1) !== 'u') {
         // Invalid format
         return ret;
      }
      ret.userId = parseInt(uidStr.substring(1));
   }

   return ret;
}

/**
 * Exports
 */
module.exports = {
    create,
    parse
};
