const AWS = require('aws-sdk');
//const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const gatewayHelper = require('gatewayHelper.js');

AWS.config.update({region: 'REGION'});

exports.handler = async (event) => {
    console.log(event);
    return gatewayHelper.respond(200, null, '{"results":"success"}');
    const params = {
        TableName: process.env.TABLE_NAME,
        Key: {
            'SensorId': {S: event.id}
        },
        ProjectionExpression: 'ATTRIBUTE_NAME'
    };

    return gatewayHelper.respond(200, null, '{"result":"success"}');
};
