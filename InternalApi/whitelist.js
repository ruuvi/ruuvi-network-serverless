const gatewayHelper = require('../Helpers/gatewayHelper');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const validator = require('../Helpers/validator');
const redis = require('../Helpers/redisHelper').getClient();
const errorCodes = require('../Helpers/errorCodes');
const dynamoHelper = require('../Helpers/dynamoHelper');

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

    if (!validator.validateAll(eventBody, [
        { name: 'macAddress', type: 'MAC', required: true },
        { name: 'secret', type: 'STRING', required: true }
    ], false)) {
        console.error("Invalid Gateway Data", eventBody);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid macAddress or secret.", errorCodes.ER_ER_INVALID_FORMAT);
    }

    console.log(`Whitelisting gateway: ${eventBody.macAddress}`);

    const tableName = process.env.WHITELIST_TABLE_NAME;
    const macAddress = eventBody.macAddress;
    const secret = eventBody.secret;

    let batch = {
        RequestItems: { }
    };
    batch.RequestItems[tableName] = [];

    let gatewaySeen = {};

    // Last seen timestamps
    let seen = false;
    try {
        console.log(`Fetching last invalid signature timestamp for ${macAddress}`);
        var lastSeen = await redis.get('invalid_signature_' + macAddress.toUpperCase());
        gatewaySeen = {
            macAddress: macAddress,
            blockedAt: lastSeen
        };

        if (parseInt(lastSeen) > 0) {
            seen = true;
        }

        const data = await dynamoHelper.fetch(tableName, 'GatewayId', macAddress, ['GatewayId', 'Whitelisted', 'Connected', 'Latest']);
        if (data.length > 0) {
            if (parseInt(data[0].Whitelisted) > 0) {
                return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, 'Gateway already whitelisted', errorCodes.ER_GATEWAY_ALREADY_WHITELISTED);
            }
            if (parseInt(data[0].Connected) > 0 || parseInt(data[0].Latest) > 0) {
                seen = true;
            }
        }
        console.log(`Successfully fetched invalid signature timestamp for ${macAddress}`, lastSeen);
    } catch (e) {
        console.error("Error fetching invalid signature timestamp", e);
        gatewaySeen = {
            macAddress: macAddress,
            blockedAt: 0,
            message: 'Unable to fetch data'
        };
    }

    if (!seen) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, 'Request was valid, but gateway has not been seen yet.', errorCodes.ER_GATEWAY_NOT_FOUND);
    }

    batch.RequestItems[tableName].push({
        PutRequest: {
            Item: {
                "GatewayId": { "S": macAddress },
                "Secret": { "S": secret },
                "Whitelisted": { "N": Date.now().toString() },
                "Connected": { "N": "0" },
                "Latest": { "N": "0" }
            }
        }
    });
   
    try {
        await dynamo.batchWriteItem(batch, function(err, data) {
            if (err) {
                console.error("Error", err);
            }
        }).promise();
    } catch (e) {
        console.error("Error writing whitelist batch to Dynamo", e);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, 'Error storing whitelisted gateway.', errorCodes.INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }

    console.log('Whitelisted gateway: ', macAddress);

    return gatewayHelper.successResponse({
        gateway: gatewaySeen
    });
};
