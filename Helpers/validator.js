/**
 * Validates that keys are present in the given object
 *
 * @param {object} given
 * @param {array} target
 */
const hasKeys = (given, target) => {
  if (!given || target.length === 0) {
    return false;
  }
  let found = true;
  target.forEach((item) => {
    if (!Object.prototype.hasOwnProperty.call(given, item)) {
      found = false;
      return found;
    }
  });
  return found;
};

/**
 * Validates a given object against a field definition rule set.
 *
 * @param {object} given Given data object
 * @param {array} definitions Array of definitions: [{'name': ..., 'type': ..., required: true|false}, ...]
 * @param {bool} allowExtra If false, will reject validation if non-listed definitions are present
 * @return true if valid, false otherwise
 */
const validateAll = (given, definitions, allowExtra = true) => {
  const validatableTypes = ['MAC', 'EMAIL', 'TOKEN', 'INT', 'STRING', 'ARRAY'];

  if (!given) {
    console.error('Failed to validate empty data', given);
    return false;
  }

  for (const definition of definitions) {
    if (!validatableTypes.includes(definition.type)) {
      console.error(`Invalid validation type: ${definition.type}`, definition);
    }

    // Required missing
    if (!Object.prototype.hasOwnProperty.call(given, definition.name) && definition.required) {
      console.error(`No required definition for ${definition.name}`, given);
      return false;
    }

    // Present with invalid format
    if (given[definition.name]) {
      if (definition.type === 'MAC' && !validateMacAddress(given[definition.name])) {
        console.error('Failed to validate MAC', given[definition.name]);
        return false;
      }
      if (definition.type === 'EMAIL' && !validateEmail(given[definition.name])) {
        console.error('Failed to validate EMAIL', given[definition.name]);
        return false;
      }
      if (definition.type === 'TOKEN' && !validateToken(given[definition.name])) {
        console.error('Failed to validate TOKEN', given[definition.name]);
        return false;
      }
      if (definition.type === 'INT' && isNaN(given[definition.name])) {
        console.error('Failed to validate INT', given[definition.name]);
        return false;
      }
      if (definition.type === 'ALPHANUM' && !validateAlphaNumeric(given[definition.name])) {
        console.error('Failed to validate ALPHANUM', given[definition.name]);
        return false;
      }
      if ((definition.type === 'STRING') && (!validateString(given[definition.name]))) {
        console.error('Failed to validate STRING', given[definition.name]);
        return false;
      }
      if (definition.type === 'ARRAY' && Array.isArray(given[definition.name])) {
        console.error('Failed to validate ARRAY', given[definition.name]);
        return false;
      }
    }
  }

  if (!allowExtra) {
    const keys = Object.keys(given);
    const definitionNames = [];
    for (const definition of definitions) {
      definitionNames.push(definition.name);
    }

    const difference = keys.filter(x => !definitionNames.includes(x));
    if (difference.length > 0) {
      console.error('Invalid additional keys in input', difference);
      return false;
    }
  }

  return true;
};

/**
 * Validates whether an e-mail is valid.
 *
 * @param {string} email
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') { return false; }
  const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegexp.test(email);
};

/**
 * Validates token format.
 *
 * @param {string} token
 */
const validateToken = (token) => {
  if (!token || typeof token !== 'string') { return false; }
  const tokenValidationRegexp = /^[0-9a-f]+?\/[0-9a-zA-Z]+?$/;
  return tokenValidationRegexp.test(token);
};

/**
 * Validates that string is alphanumeric. Accepts empty string.
 *
 * @param {string} str String to validate
 */
const validateAlphaNumeric = (str) => {
  if (typeof str !== 'string') { return false; }
  const reg = /^[a-zA-Z0-9]+$/;
  return reg.test(str);
};

/**
 * Validates that string is alphanumeric with underscore for db tables. Accepts empty string.
 *
 * @param {string} str String to validate
 */
const validateTableName = (str) => {
  if (typeof str !== 'string') { return false; }
  const reg = /^[a-zA-Z0-9_]+$/;
  return reg.test(str);
};

/**
 * Validates that string is alphanumeric filename with or without extensions. Accepts empty string.
 *
 * @param {string} str String to validate
 */
const validateFilename = (str) => {
  if (typeof str !== 'string') { return false; }
  const reg = /^[a-zA-Z0-9.\-_]+$/;
  return reg.test(str);
};

/**
 * Validates that string is compatible with settings name - alphanumeric with set of special characters
 *
 * @param {string} str String to validate
 */
const validateSettingName = (str) => {
  if (!str || typeof str !== 'string') { return false; }
  const reg = /^[a-zA-Z0-9_\-.]+$/;
  return reg.test(str);
};

/**
 * Validates that string is a MAC address
 *
 * @param {string} str String to validate
 */
const validateMacAddress = (str) => {
  if (!str || typeof str !== 'string') { return false; }
  const reg = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return reg.test(str);
};

/**
 * Validates that string a string is a value in an array
 *
 * @param {string} str String to validate
 */
const validateEnum = (str, values) => {
  if (!str || typeof str !== 'string') { return false; }
  if (!Array.isArray(values)) {
    return false;
  }
  return values.includes(str);
};

/**
 * Validates that given parameter is a non-empty string.
 *
 * @param {string} str String to validate
 */
const validateString = (str) => {
  if (str && (typeof str === 'string') && (str !== '')) {
    return true;
  }
  return false;
};

const now = () => {
  return Date.now() / 1000;
};

/**
 * Exports
 */
module.exports = {
  hasKeys,
  validateAll,
  validateEmail,
  validateToken,
  validateAlphaNumeric,
  validateMacAddress,
  validateSettingName,
  validateString,
  validateEnum,
  validateFilename,
  validateTableName,
  now
};
