const gatewayHelper = require('../Helpers/gatewayHelper');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});

exports.handler = async (event, context) => {
    // TODO: This should no longer be required
    if (event.httpMethod === 'OPTIONS') {
        return gatewayHelper.ok();
    }

    const apiKey = process.env.INTERNAL_API_KEY;
    if (apiKey === null || apiKey === '' || gatewayHelper.getHeader('X-Internal-Secret', event.headers) !== apiKey) {
        return gatewayHelper.invalid();
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !eventBody.gateways || !eventBody.gateways.length) {
        return gatewayHelper.invalid();
    }

    const gateways = eventBody.gateways;

    let batch = {
        RequestItems: { }
    };
    const tableName = process.env.WHITELIST_TABLE_NAME;

    batch.RequestItems[tableName] = [];

    for (let i = 0, len = gateways.length; i < len; i++) {
        const inputData = gateways[i];
        batch.RequestItems[tableName].push({
            PutRequest: {
                Item: {
                    "GatewayId": { "S": inputData.gatewayId },
                    "DeviceId": { "S": inputData.deviceId },
                    "DeviceAddr": { "S": inputData.deviceAddr },
                    "Whitelisted": { "N": Date.now().toString() },
                    "Connected": { "N": 0 },
                    "Latest": { "N": 0 }
                }
            }
        });

        if (batch.RequestItems[tableName].length >= 25) {
            await dynamo.batchWriteItem(batch, function(err, data) {
                if (err) {
                    console.error("Error", err);
                }
            }).promise();
            batch.RequestItems[tableName] = [];
        }
    }

    if (batch.RequestItems[tableName].length > 0) {
        await dynamo.batchWriteItem(batch, function(err, data) {
            if (err) {
                console.error("Error", err);
            }
        }).promise();
    }

    return gatewayHelper.ok();
};
