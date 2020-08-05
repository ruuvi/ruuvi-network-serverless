const AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB.DocumentClient();
const gatewayHelper = require('Helpers/gatewayHelper.js');

AWS.config.update({region: 'eu-west-1'});

exports.handler = async (event, context) => {
    // Authorization
    if (process.env.ACCESS_KEY !== "" && event.headers.authorization !== 'Bearer ' + process.env.ACCESS_KEY) {
        // Forbidden
        return gatewayHelper.forbidden();
    }
    
    // Validation
    if (
        !event.queryStringParameters.hasOwnProperty('tag')
        || event.queryStringParameters.tag === null
        || event.queryStringParameters.tag.length < 8) {

        // Invalid request
        return gatewayHelper.invalid();
    }

    const tag = event.queryStringParameters.tag;
    const params = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'SensorId = :id',
        ExpressionAttributeValues: {
            ":id": tag
        },
        ProjectionExpression: 'SensorId,Coordinates,SensorData,GatewayMac,MeasurementTimestamp,RSSI'
    };
    
    const rawData = await ddb.query(params).promise();
    if (rawData.Items.length === 0) {
        // Not found
        return gatewayHelper.notFound();
    }

    return gatewayHelper.ok(null, JSON.stringify({
        result: "success",
        data: {
            Tag: tag,
            Total: rawData.Items.length,
            Measurements: rawData.Items
        }
    }, null, 4)); // 4 = pretty-print depth (TODO: Change to 0 eventually)
};
