const gatewayHelper = require('../Helpers/gatewayHelper');
const AWS = require('aws-sdk');
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

    if (!validator.validateAll(eventBody, [
        { name: 'macAddress', type: 'MAC', required: true }
    ], false)) {
        console.error("Invalid Gateway Data", eventBody);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Invalid macAddress or secret.", errorCodes.ER_ER_INVALID_FORMAT);
    }

    console.log(`Removing whitelisted gateway: ${eventBody.macAddress}`);

    const tableName = process.env.WHITELIST_TABLE_NAME;
    const macAddress = eventBody.macAddress;

    // Last seen timestamps
    try {
        console.log(`Fetching last invalid signature timestamp for ${macAddress}`);
        await redis.del('invalid_signature_' + macAddress.toUpperCase());

        // Clear whitelisting
        var params = {
            TableName : tableName,
            Key: {
                GatewayId: macAddress
            }
        };
          
        var documentClient = new AWS.DynamoDB.DocumentClient();
          
        var res = await documentClient.delete(params).promise();
        console.log(res);
    } catch (e) {
        console.error("Error fetching invalid signature timestamp", e);
    }

    return gatewayHelper.successResponse({
        gateway: macAddress
    });
};
