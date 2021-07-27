const gatewayHelper = require('../Helpers/gatewayHelper');
const dynamoHelper = require('../Helpers/dynamoHelper');
const redis = require('../Helpers/redisHelper').getClient();
const validator = require('../Helpers/validator');

exports.handler = async (event, context) => {
    // TODO: This should no longer be required
    if (event.httpMethod === 'OPTIONS') {
        return gatewayHelper.ok();
    }

    const apiKey = process.env.INTERNAL_API_KEY;
    if (apiKey === null || apiKey === '' || gatewayHelper.getHeader('X-Internal-Secret', event.headers) !== apiKey) {
        return gatewayHelper.invalid();
    }

    const gateway = event.queryStringParameters.gateway;

    if (!validator.validateMacAddress(event.queryStringParameters.gateway)) {
        return gatewayHelper.invalid();
    }

    let invalidSignatureTimestamp = 0;
    try {
        invalidSignatureTimestamp = await redis.get('invalid_signature_' + gateway.toUpperCase());
        if (invalidSignatureTimestamp === null) {
            invalidSignatureTimestamp = 0;
        }
    } catch (e) {
        console.error('Error fetching invalid signature timestamp.');
        return gatewayHelper.internal();
    }

    let returnData = {
        'GatewayId': gateway,
        'Whitelisted': 0,
        'Connected': 0,
        'Latest': 0,
        'InvalidSignatureTimestamp': invalidSignatureTimestamp
    };

    const tableName = process.env.WHITELIST_TABLE_NAME;

    try {
        const data = dynamoHelper.fetch(tableName, 'GatewayId', gateway, ['GatewayId', 'Whitelisted', 'Connected', 'Latest']);
        if (data.length > 0) {
            returnData = {
                ...returnData,
                ...data[0]
            };
        }
    } catch (e) {
        console.error('Error fetching Dynamo Data', e);
        return gatewayHelper.internal();
    }

    return gatewayHelper.successResponse({
        gateway: returnData
    });
};
