const AWS = require('aws-sdk');
const gatewayHelper = require('gatewayHelper.js');

AWS.config.update({region: 'eu-west-1'});

var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

/**
 * Sends received data to SQS queue for processing
 */
exports.handler = async (event, context) => {
    // TODO: Validate signature / key
    
    // TODO: This validation is pretty rudimentary
    const eventBody = JSON.parse(event.body);
    const data = eventBody.data;
    
    if (
        !eventBody.hasOwnProperty('data')
        || !data.hasOwnProperty('tags')
        || !data.hasOwnProperty('gwmac')
        || !data.hasOwnProperty('timestamp')
        || !data.hasOwnProperty('coordinates')
    ) {
        console.error("Invalid Data: " + event.body);
        return gatewayHelper.response(400);
    }
    
    // SQS Message Properties will contain gateway data
    const params = {
        DelaySeconds: 0,
        MessageAttributes: {
            "gwmac": {
                DataType: "String",
                StringValue: data.gwmac
            },
            "timestamp": {
                DataType: "Number",
                StringValue: "" + data.timestamp
            },
            "coordinates": {
                DataType: "String",
                StringValue: data.coordinates === "" ? "N/A" : data.coordinates
            }
        },
        MessageBody: JSON.stringify(data.tags),
        QueueUrl: process.env.TARGET_QUEUE
    };

    try {
        await sqs.sendMessage(params, function(err, data) {
            if (err) {
                console.log("Error", err);
            } else {
                console.log("Success", data.MessageId);
            }
        }).promise();
    } catch (e) {
        console.error(e);
        return gatewayHelper.response(400);
    }
    
    return gatewayHelper.response(200);
};