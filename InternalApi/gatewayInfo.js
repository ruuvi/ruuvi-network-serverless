const gatewayHelper = require('../Helpers/gatewayHelper');
const AWS = require('aws-sdk');
const dynamoHelper = require('../Helpers/dynamoHelper');

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

    if (!eventBody || !eventBody.gateway) {
        return gatewayHelper.invalid();
    }

    const gateway = eventBody.gateway;
    const tableName = process.env.WHITELIST_TABLE_NAME;

    const data = dynamoHelper.fetch(tableName, 'GatewayId', gateway, ['GatewayId', 'Whitelisted', 'First', 'Latest']);

    return gatewayHelper.successResponse({
        gateway: data
    });
};
