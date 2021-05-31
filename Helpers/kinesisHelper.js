/**
 * Decodes data from a kinesis record as passed in by the event.
 * 
 * @param object record
 */
 const getData = (record) => {
    const recordDataBase64 = record.kinesis.data;
    if (!recordDataBase64) {
        console.error('Invalid data', record);
        return null;
    }

    const buff = Buffer.from(recordDataBase64, 'base64');
    const asciiData = buff.toString('ascii');
    try {
        const parsed = JSON.parse(asciiData);
        return parsed;
    } catch (e) {
        console.log('Error parsing kinesis JSON', e);
        return null;
    }
}

/**
 * Exports
 */
module.exports = {
    getData
};
