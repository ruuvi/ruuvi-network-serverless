/**
 * Validates that keys are present in the given object
 * 
 * @param {object} given 
 * @param {array} target 
 */
const hasKeys = (given, target) => {
    target.forEach((item) => {
        if (!given.hasOwnProperty(item)) {
            return false;
        }
    });
    return true;
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
    const tokenValidationRegexp = /^[a-zA-Z0-9]*$/;
    return tokenValidationRegexp.test(token);
};

/**
 * Exports
 */
module.exports = {
    hasKeys,
    validateEmail,
    validateToken
};