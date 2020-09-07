const gatewayHelper = require('Helpers/gatewayHelper');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});

exports.handler = async (event, context) => {
    const apiKey = process.env.INTERNAL_API_KEY;
    if (apiKey === null || apiKey === '' || event.headers['X-Internal-Secret'] !== apiKey) {
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
    batch.RequestItems[process.env.TABLE_NAME] = [];

    for (let i = 0, len = gateways.length; i < len; i++) {
        const inputData = gateways[i];
        batch.RequestItems[process.env.TABLE_NAME].push({
            PutRequest: {
                Item: {
                    "GatewayId": { "S": inputData.gatewayId },
                    "DeviceId": { "S": inputData.deviceId },
                    "DeviceAddr": { "S": inputData.deviceAddr }
                }
            }
        });

        if (batch.RequestItems[process.env.TABLE_NAME].length >= 25) {
            await dynamo.batchWriteItem(batch, function(err, data) {
                if (err) {
                    console.error("Error", err);
                }
            }).promise();
            batch.RequestItems[process.env.TABLE_NAME] = [];
        }
    }

    if (batch.RequestItems[process.env.TABLE_NAME].length > 0) {
        await dynamo.batchWriteItem(batch, function(err, data) {
            if (err) {
                console.error("Error", err);
            }
        }).promise();
    }

    return gatewayHelper.ok();
};
