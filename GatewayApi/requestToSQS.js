const AWS = require('aws-sdk');
const gatewayHelper = require('Helpers/gatewayHelper.js');
const auth = require('Helpers/authHelper')

AWS.config.update({region: 'eu-central-1'});

var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

/**
 * Sends received data to SQS queue for processing
 */
exports.handler = async (event, context) => {
    const signature = gatewayHelper.getHeader('x-ruuvi-signature', event.headers);
    const timestamp = gatewayHelper.getHeader('x-ruuvi-timestamp', event.headers);
    const nonce = gatewayHelper.getHeader('x-ruuvi-nonce', event.headers);
    const eventBody = JSON.parse(event.body);

    const data = eventBody.data;

    // TODO: This validation is pretty rudimentary
    if (
        !eventBody.hasOwnProperty('data')
        || !data.hasOwnProperty('tags')
        || !data.hasOwnProperty('gwmac')
        || !data.hasOwnProperty('timestamp')
        || !data.hasOwnProperty('coordinates')
    ) {
        console.error("Invalid Data: " + event.body);
        return gatewayHelper.invalid();
    }

    if (signature !== null || process.env.ENFORCE_SIGNATURE === '1') {
        const validationResult = await auth.validateGatewaySignature(
            signature,
            eventBody,
            data.gwmac,
            nonce,
            timestamp,
            process.env.GATEWAY_REQUEST_TTL,
            process.env.GATEWAY_SIGNATURE_SECRET
        );

        if (!validationResult) {
            console.error("Invalid signature: " + signature);
            return gatewayHelper.forbidden();
        }
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
        return gatewayHelper.invalid();
    }

    // Include the gateway request rate by default
    return gatewayHelper.ok(null, {
        [gatewayHelper.RequestRateHeader] : process.env.GATEWAY_SEND_RATE
    });
};
