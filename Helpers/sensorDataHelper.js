/**
 * Offsets for Data Format 5 (RAWv2)
 *   https://github.com/ruuvi/ruuvi-sensor-protocols/blob/master/dataformat_05.md
 */
const v5Offsets = {
    FORMAT: 0,
    TEMPERATURE: 1,
    HUMIDITY: 3,
    PRESSURE: 5,
    ACCELERATION_X: 7,
    ACCELERATION_Y: 9,
    ACCELERATION_Z: 11,
    POWER_INFO: 13,
    MOVEMENTS: 15,
    MEASUREMENT_SEQUENCE: 16,
    MAC_ADDRESS: 18
};


/**
 * Parses the given hex encoded data into an object. Optionally, a version can be provided.
 * 
 * @param string data
 * @param int version version number, 5 by default
 */
 const parseData = (data, version = 5) => {
    let result = {
        format: 0, // Version number, i.e. 5
        temperature: 0, // -32767..32767 temperature in 0.005 degrees
        humidity: 0, // 16bit unsigned in 0.0025% (0-163.83%)
        pressure: 0, // 16bit unsigned, offset -50,000 Pa
        accelerationX: 0, // -32767..32767 (Most significant bit first)
        accelerationY: 0, // -32767..32767 (Most significant bit first)
        accelerationZ: 0, // -32767..32767 (Most significant bit first)

        batteryVoltageAbove16V: 0, // 11bits in millivolts
        txPowerAboveminus40dBm: 0, // 5bits in 2dBm steps
        
        movementCounter: 0, // 8bit unsigned
        measurementSequenceNumber: 0, // 16bit unsigned
        macAddress: '' // 48bit MAC Address
    };

    let buffer = Buffer.from(data, 'hex');
    const offsets = v5Offsets;

    const ignoreBytes = 6;

    result.format = buffer.readUInt8(ignoreBytes + offsets.FORMAT);

    if (result.format !== 5) {
        //throw new Error("Not supported yet: Version " + result.format);
    }

    result.temperature = buffer.readInt16LE(ignoreBytes + offsets.TEMPERATURE) * 0.005;
    result.humidity = buffer.readUInt16LE(ignoreBytes + offsets.HUMIDITY) * 0.0025;
    result.pressure = (buffer.readUInt16LE(ignoreBytes + offsets.PRESSURE) + 50000) / 100; // hPa

    /*
    result.accelerationX = buffer.readInt16BE(offsets.ACCELERATION_X);
    result.accelerationY = buffer.readInt16BE(offsets.ACCELERATION_Y);
    result.accelerationZ = buffer.readInt16BE(offsets.ACCELERATION_Z);
    
    // Power info
    const powerInfo = buffer.readInt16LE(offsets.POWER_INFO);
    
    result.movementCounter = buffer.readUInt8(offsets.MOVEMENTS);
    result.movementSequenceNumber = buffer.readUInt8(offsets.MEASUREMENT_SEQUENCE);
    result.macAddress = buffer.readUIntLE(offsets.MEASUREMENT_SEQUENCE, 6);*/

    return result;
}

/**
 * Exports
 */
module.exports = {
    parseData
};
