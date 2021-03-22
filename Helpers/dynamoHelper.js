const AWS = require('aws-sdk');
const validator = require('./validator');
var ddb = new AWS.DynamoDB.DocumentClient();

/**
 * Validates an individual sensor data point.
 */
const validateSensorData = (data) => {
    // Data field existence
    const fields = ['rssi', 'data', 'coordinates', 'timestamp', 'id', 'gwmac'];
    for (let i = 0, len = fields.length; i < len; i++) {
        if (!data.hasOwnProperty(fields[i])) {
            console.debug("Missing '" + fields[i] + "' from data.");
            return false;
        }
    }

    // TODO: Other validation - per row validation

    return true;
}

/**
 * Formats the raw sensor data to DynamoDB row format.
 */
const dynamoFormat = (inputData) => {
    let data = {
        "SensorId": { "S": inputData.id },
        "MeasurementTimestamp": { "N": inputData.timestamp.toString() },
        "SensorData": { "S": inputData.data },
        "RSSI": { "N": inputData.rssi.toString() },
        "GatewayMac": { "S": inputData.gwmac },
        "GatewayTimestamp": { "S": inputData.received },
        "Coordinates": { "S": inputData.coordinates },
        "ReceivedAt": { "N": Date.now().toString() }
    };

    if (inputData.ttl) {
        data['TimeToLive'] = { "N": inputData.ttl.toString() };
    }

    return data;
}

/**
 * Formats the raw JSON objects into a batch for DynamoDB.
 */
const getDynamoBatch = (inputData, tableName = null) => {
    if (!tableName) {
        tableName = process.env.TABLE_NAME;
    }
    let batch = {
        RequestItems: { }
    };
    batch.RequestItems[tableName] = [];

    for (let i = 0, len = inputData.length; i < len; i++) {
        if (!validateSensorData(inputData[i])) {
            return null;
        }

        batch.RequestItems[tableName].push({
            PutRequest: {
                Item: dynamoFormat(inputData[i])
            }
        });
    }

    return batch;
}

/**
 * Fetches data from a DynamoDB table.
 *
 * @param {string} tableName Name of the table to fetch data from
 * @param {string} keyName Name of the key being fetched by
 * @param {mixed} keyValue Value to be scanned for
 * @param {array} fieldNames Array of field names to fetch
 * @param {integer} limit Maximum result count to return
 * @param {bool} scanForward Forward or backward scan on the query
 * @returns {array} Array of items from the database
 */
const fetch = async (tableName, keyName, keyValue, fieldNames, limit = 10000, scanForward = false, rangeField = null, rangeStart = null, rangeEnd = null) => {
    const fieldsString = fieldNames.join(',')

    let params = {
        TableName: tableName,
        KeyConditionExpression: '#id = :id',
        ExpressionAttributeNames: {
            "#id": keyName
        },
        ExpressionAttributeValues: {
            ":id": keyValue
        },
        ProjectionExpression: fieldsString,
        ScanIndexForward: scanForward,
        Limit: limit
    };

    if (rangeField && (rangeStart || rangeEnd)) {
        if (!rangeEnd) {
            rangeEnd = validator.now();
        }
        if (!rangeStart) {
            rangeStart = 0;
        }

        params.KeyConditionExpression += " AND #range BETWEEN :since AND :until";
        params.ExpressionAttributeNames['#range'] = rangeField;

        params.ExpressionAttributeValues[':since'] = rangeStart;
        params.ExpressionAttributeValues[':until'] = rangeEnd;
    }

    const rawData = await ddb.query(params).promise();
    if (!rawData || !rawData.hasOwnProperty('Items')) {
        console.error("No data returned!", rawData);
        return [];
    }

    return rawData.Items;
}

/**
 * Retrieves sensor data from Dynamo based on parameters.
 * Fetches most recent if date range is not given.
 *
 * @param {string} sensor Sensor ID / MAC
 * @param {int} count Desired maximum result count
 * @param {date} startDate Start date for results
 * @param {date} endDate End date for results
 * @param {boolean} ascending When true, returns oldest result first
 * @param {string} tableName When set, will fetch data from this table instead 
 */
const getSensorData = async (sensor, count, startDate, endDate, ascending = false, tableName = null) => {
    if (tableName === null) {
        tableName = process.env.TABLE_NAME;
    }
    if (typeof(process.env.TABLE_NAME) === 'undefined') {
        console.error('TABLE_NAME not defined in environment.');
        return [];
    }

    return fetch(
        tableName,
        'SensorId',
        sensor,
        ['SensorId', 'Coordinates', 'SensorData', 'GatewayMac', 'MeasurementTimestamp', 'RSSI'],
        count,
        ascending,
        'MeasurementTimestamp',
        startDate,
        endDate
    );
}

/**
 * Fetches the information such as device id and device addr for a given gateway.
 *
 * @param {string} gatewayId ID of the gateway data to fetch
 */
const getGatewayData = async (gatewayId) => {
    if (typeof process.env.WHITELIST_TABLE_NAME === 'undefined') {
        console.error('WHITELIST_TABLE_NAME not defined in environment.');
        return [];
    }

    return fetch(
        process.env.WHITELIST_TABLE_NAME,
        'GatewayId',
        gatewayId,
        ['GatewayId', 'DeviceId', 'DeviceAddr'],
        1,
        false
    );
}

/**
 * Gets the alerts for a given sensor.
 * 
 * @param {string} sensorId ID of the sensor to get the alert for
 * @returns 
 */
const getAlerts = async (sensorId) => {
    if (typeof process.env.ALERT_TABLE_NAME === 'undefined') {
        console.error('ALERT_TABLE_NAME not defined in environment.');
        return [];
    }

    return fetch(
        process.env.ALERT_TABLE_NAME,
        'SensorId',
        sensorId,
        ['Type', 'Enabled', 'MinValue', 'MaxValue']
    );
}

/**
 * Gets the alert of a type for a given sensor.
 * 
 * @param {string} sensorId ID of the sensor to get the alert for
 * @param {enum} type Type in: ['temperature', 'humidity', 'pressure', 'signal', 'movement']
 * @returns 
 */
 const putAlert = async (sensorId, type, enabled = true, min = Number.MIN_VALUE, max = Number.MAX_VALUE) => {
    if (typeof process.env.ALERT_TABLE_NAME === 'undefined') {
        console.error('ALERT_TABLE_NAME not defined in environment.');
        return [];
    }
    if (!validator.validateEnum(type, ['temperature', 'humidity', 'pressure', 'signal', 'movement'])) {
        console.error('Invalid type given: ' + type);
        return [];
    }

    const alert = {
        TableName: process.env.ALERT_TABLE_NAME,
        Item: {
            "SensorId": sensorId,
            "Type": type,
            "MinValue": min,
            "MaxValue": max,
            "Enabled": enabled
        }
    }

    return await ddb.put(alert).promise();
}

/**
 * Exports
 */
module.exports = {
    getDynamoBatch,
    dynamoFormat,
    validateSensorData,
    getSensorData,
    getGatewayData,
    getAlerts,
    putAlert,
    fetch
};
