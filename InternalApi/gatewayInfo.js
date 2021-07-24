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

    
    const tableName = process.env.WHITELIST_TABLE_NAME;

    let data = {};
    try {
        data = dynamoHelper.fetch(tableName, 'GatewayId', gateway, ['GatewayId', 'Whitelisted', 'Connected', 'Latest']);
    } catch (e) {
        console.error('Error fetching Dynamo Data', e);
        return gatewayHelper.internal();
    }

    if (!data.GatewayId) {
        data = { "GatewayId": gateway };
    }

    const invalidSignatureTimestamp = await redis.get('invalid_signature_' + gateway.toUpperCase());
    data.InvalidSignatureTimestamp = invalidSignatureTimestamp;

    return gatewayHelper.successResponse({
        gateway: data
    });
};
