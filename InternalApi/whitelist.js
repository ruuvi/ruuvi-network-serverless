const gatewayHelper = require('../Helpers/gatewayHelper');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const validator = require('../Helpers/validator');
const redis = require('../Helpers/redisHelper').getClient();
const errorCodes = require('../Helpers/errorCodes');

exports.handler = async (event, context) => {
    console.log('Event', event);

    // TODO: This should no longer be required
    if (event.httpMethod === 'OPTIONS') {
        return gatewayHelper.ok();
    }

    const apiKey = process.env.INTERNAL_API_KEY;
    if (apiKey === null || apiKey === '' || gatewayHelper.getHeader('X-Internal-Secret', event.headers) !== apiKey) {
        console.error('Invalid or missing API Key', apiKey, event.headers);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.FORBIDDEN, "Invalid credentials.", errorCodes.ER_FORBIDDEN);
    }

    const eventBody = JSON.parse(event.body);

    if (!eventBody || !eventBody.gateways || !eventBody.gateways.length) {
        console.error("Invalid Gateways", eventBody);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid input data. Required: gateways.", errorCodes.ER_ER_INVALID_FORMAT);
    }

    const gateways = eventBody.gateways;
    console.log('Whitelisting gateways', gateways);

    let batch = {
        RequestItems: { }
    };
    const tableName = process.env.WHITELIST_TABLE_NAME;

    batch.RequestItems[tableName] = [];

    let gatewaysSeen = [];
    
    for (let i = 0, len = gateways.length; i < len; i++) {
        const inputData = gateways[i];
        if (!validator.hasKeys(inputData, ['macAddress', 'secret']) || !validator.validateMacAddress(inputData.macAddress)) {
            console.error('Invalid inputData', inputData);
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid gateway data. Required: macAddress (valid), secret.", errorCodes.ER_ER_INVALID_FORMAT);
        }
        batch.RequestItems[tableName].push({
            PutRequest: {
                Item: {
                    "GatewayId": { "S": inputData.macAddress },
                    "Secret": { "S": inputData.secret },
                    "Whitelisted": { "N": Date.now().toString() },
                    "Connected": { "N": "0" },
                    "Latest": { "N": "0" }
                }
            }
        });

        if (batch.RequestItems[tableName].length >= 25) {
            try {
                await dynamo.batchWriteItem(batch, function(err, data) {
                    if (err) {
                        console.error("Error", err);
                    }
                }).promise();
            } catch (e) {
                console.error("Error writing whitelist batch to Dynamo", e);
            }
            batch.RequestItems[tableName] = [];
        }

        // List seen timestamps
        try {
            console.log(`Fetching last invalid signature timestamp for ${inputData.macAddress}`, inputData);
            var lastSeen = await redis.get('invalid_signature_' + inputData.macAddress.toUpperCase());
            gatewaysSeen.push({
                macAddress: inputData.macAddress,
                blockedAt: lastSeen
            });
            console.log(`Successfully fetched invalid signature timestamp for ${inputData.macAddress}`, lastSeen);
        } catch (e) {
            console.error("Error fetching invalid signature timestamp", e);
            gatewaysSeen.push({
                macAddress: inputData.macAddress,
                blockedAt: 0,
                message: 'Unable to fetch data'
            });
        }
    }

    if (batch.RequestItems[tableName].length > 0) {
        try {
            await dynamo.batchWriteItem(batch, function(err, data) {
                if (err) {
                    console.error("Error", err);
                }
            }).promise();
        } catch (e) {
            console.error("Error writing whitelist batch to Dynamo", e);
        }
    }

    console.log('Whitelisted gateways', gateways);

    return gatewayHelper.successResponse({
        gateways: gatewaysSeen
    });
};
