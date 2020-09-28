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
    const tokenValidationRegexp = /^[a-zA-Z0-9-_.]+$/;
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
