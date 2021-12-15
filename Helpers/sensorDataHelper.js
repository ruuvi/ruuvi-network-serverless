
const ruuviParser = require('../Helpers/ruuviParser');

const parseData = (data) => {
  const measurements = data.substring(data.indexOf('9904'));

  const buffer = Buffer.from(measurements, 'hex');
  const result = ruuviParser.parseManufacturerData(buffer);
  if (result === null) {
    throw new Error('Invalid format');
  }
  return result;
};

/**
 * Exports
 */
module.exports = {
  parseData
};
