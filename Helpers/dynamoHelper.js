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
 * Retrieves sensor data from Dynamo based on parameters.
 * Fetches most recent if date range is not given.
 * 
 * @param {string} tag Tag ID / MAC
 * @param {int} count Desired maximum result count
 * @param {date} startDate Start date for results
 * @param {date} endDate End date for results
 */
const getSensorData = async (tag, count, startDate, endDate) => {
    const params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'SensorId = :id',
        ExpressionAttributeValues: {
            ":id": tag
        },
        ProjectionExpression: 'SensorId,Coordinates,SensorData,GatewayMac,MeasurementTimestamp,RSSI',
        ScanIndexForward: false,
        Limit: count
    };
    
    const rawData = await ddb.query(params).promise();
    if (!rawData || !rawData.hasOwnProperty('Items')) {
        console.error("No data returned!", rawData);
        return [];
    }
    return rawData.Items;
}

/**
 * Exports
 */
module.exports = {
    getDynamoBatch,
    dynamoFormat,
    validateSensorData,
    getSensorData
};