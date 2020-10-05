/**
 * Validates that keys are present in the given object
 *
 * @param {object} given
 * @param {array} target
 */
const hasKeys = (given, target) => {
    let found = true;
    target.forEach((item) => {
        if (!given.hasOwnProperty(item)) {
            found = false;
            return found;
        }
    });
    return found;
};

/**
 * Validates whether an e-mail is valid.
 *
 * @param {string} email
 */
const validateEmail = (email) => {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegexp.test(email);
};

/**
 * Validates token format.
 *
 * @param {string} token
 */
const validateToken = (token) => {
    const tokenValidationRegexp = /^[0-9a-f]\/\$2[ayb]\$.{56}?$/;
    return tokenValidationRegexp.test(token);
};

/**
 * Validates that string is alphanumeric
 *
 * @param {string} str String to validate
 */
const validateAlphaNumeric = (str) => {
    const reg = /^[a-zA-Z0-9]+$/;
    return reg.test(str);
};

/**
 * Exports
 */
module.exports = {
    hasKeys,
    validateEmail,
    validateToken,
    validateAlphaNumeric
};
