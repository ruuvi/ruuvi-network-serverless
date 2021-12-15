const dataFormats = require('../Helpers/dataformats/formats');

const getReadings = (encodedData, encoding = 'hex') => {
  function addPaddingIfNecessary (str) {
    // if encoded data is truncated (data format 4), add some random padding
    return str.length === 9 ? str + 'a==' : str;
  }

  const buffer = Buffer.from(addPaddingIfNecessary(encodedData), encoding);

  // validate
  if (buffer.length < 6 || buffer.length > 7) {
    return new Error('Invalid data');
  }
  const dataFormat = buffer[0];

  return dataFormat === 2 || dataFormat === 4
    ? Object.assign({ dataFormat: dataFormat }, dataFormats.formats_2_and_4.parse(buffer))
    : new Error('Unsupported data format: ' + dataFormat);
};

const parseManufacturerData = dataBuffer => {
  const dataFormat = dataBuffer[2];
  switch (dataFormat) {
    case 3:
      return dataFormats.format_3.parse(dataBuffer);
    case 5:
      return dataFormats.format_5.parse(dataBuffer);
    default:
      return null;
  }
};

module.exports = {
  getReadings,
  parseManufacturerData
};
