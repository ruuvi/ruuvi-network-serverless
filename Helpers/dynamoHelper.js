const AWS = require('aws-sdk');
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
    return {
        "SensorId": { "S": inputData.id },
        "MeasurementTimestamp": { "N": inputData.timestamp.toString() },
        "SensorData": { "S": inputData.data },
        "RSSI": { "N": inputData.rssi.toString() },
        "GatewayMac": { "S": inputData.gwmac },
        "GatewayTimestamp": { "S": inputData.received },
        "Coordinates": { "S": inputData.coordinates },
        "ReceivedAt": { "N": Date.now().toString() }
    };
}

/**
 * Formats the raw JSON objects into a batch for DynamoDB.
 */
const getDynamoBatch = (inputData) => {
    let batch = {
        RequestItems: { }
    };
    batch.RequestItems[process.env.TABLE_NAME] = [];

    for (let i = 0, len = inputData.length; i < len; i++) {
        if (!validateSensorData(inputData[i])) {
            return null;
        }

        batch.RequestItems[process.env.TABLE_NAME].push({
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
const fetch = async (tableName, keyName, keyValue, fieldNames, limit = 1, scanForward = false) => {
    const fieldsString = fieldNames.join(',')
    
    const params = {
        TableName: tableName,
        KeyConditionExpression: keyName + ' = :id',
        ExpressionAttributeValues: {
            ":id": keyValue
        },
        ProjectionExpression: fieldsString,
        ScanIndexForward: scanForward,
        Limit: limit
    };

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
 * @param {string} tag Tag ID / MAC
 * @param {int} count Desired maximum result count
 * @param {date} startDate Start date for results
 * @param {date} endDate End date for results
 */
const getSensorData = async (tag, count, startDate, endDate) => {
    if (typeof(process.env.TABLE_NAME === 'undefined')) {
        console.error('TABLE_NAME not defined in environment.');
        return [];
    }

    return fetch(
        process.env.TABLE_NAME,
        'SensorId',
        tag,
        ['SensorId', 'Coordinates', 'SensorData', 'GatewayMac', 'MeasurementTimestamp', 'RSSI'],
        count,
        false
    )
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
    )
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
    fetch
};
