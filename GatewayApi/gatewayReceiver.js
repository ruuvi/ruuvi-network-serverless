const AWS = require('aws-sdk');
const gatewayHelper = require('../Helpers/gatewayHelper.js');
const auth = require('../Helpers/authHelper')
const throttleHelper = require('../Helpers/throttleHelper');
const alertHelper = require('../Helpers/alertHelper');
const sensorDataHelper = require('../Helpers/sensorDataHelper');
const validator = require('../Helpers/validator');

AWS.config.update({region: 'eu-central-1'});
const kinesis = new AWS.Kinesis({apiVersion: '2013-12-02'});

/**
 * Sends received data to Kinesis Stream for processing
 */
exports.handler = async (event, context) => {
    const eventBody = JSON.parse(event.body);
    const data = eventBody.data;

    // TODO: This validation is pretty rudimentary
    const MAX_UPLOAD_DELAY = 30 * 24 * 60 * 60 * 1000; // 1 month

    if (
        !validator.validateAll(data, [
            { name: 'tags', type: 'ARRAY', required: true },
            { name: 'gw_mac', type: 'MAC', required: true },
            { name: 'timestamp', type: 'INT', required: true },
            { name: 'coordinates', type: 'STRING', required: true },
        ])
        || (parseInt(data.timestamp) * 1000) < Date.now() - MAX_UPLOAD_DELAY // Cap history upload
    ) {
        return gatewayHelper.invalid();
    }

    // Signature
    const signature = gatewayHelper.getHeader(process.env.SIGNATURE_HEADER_NAME, event.headers);
    const timestamp = data.timestamp;

    if (signature !== null || parseInt(process.env.ENFORCE_SIGNATURE) === 1) {
        const validationResult = await auth.validateGatewaySignature(
            signature,
            event.body,
            data.gw_mac,
            timestamp,
            process.env.GATEWAY_REQUEST_TTL,
            process.env.GATEWAY_SIGNATURE_SECRET
        );

        if (!validationResult) {
            const redis = require('../Helpers/redisHelper').getClient();

            // Log Invalid Signature to Redis for Validation
            await redis.set('invalid_signature_' + data.gw_mac.toUpperCase(), validator.now());

            console.error("Invalid signature: " + signature);
            return gatewayHelper.unauthorizedResponse();
        }
    }

    const throttleGW = await throttleHelper.throttle('gw_' + data.gw_mac, process.env.GATEWAY_THROTTLE_INTERVAL);

    if (throttleGW) {
        return gatewayHelper.throttledResponse();
    }

    // Process per Tag Throttling + Parse Tags from data
    let unthrottledTags = {};
    let tagIds = [];
    for (var key in data.tags) {
        // Process alerts first to alert if necessary, even if throttled
        const alerts = await alertHelper.getAlerts(key, null, true);
        if (alerts.length > 0) {
            let alertData = sensorDataHelper.parseData(data.tags[key].data);
            if (alertData === null) {
                console.error('Invalid data received: ' + data.tags[key].data);
            } else {
                alertData.sensor_id = key;
                alertData.signal = data.tags[key].rssi; // Not a part of the data payload

                await alertHelper.processAlerts(alerts, alertData);
            }
        }

        // Process throttling
        const throttleSensor = await throttleHelper.throttle(key, process.env.MINIMUM_SENSOR_THROTTLE_INTERVAL);
        if (throttleSensor) {
            continue;
        }

        unthrottledTags[key] = data.tags[key];
        if (data.tags.hasOwnProperty(key)) {
            tagIds.push(key);
        }
    }

    try {
        // Sensor data format
        const dataPacket = {
            data: unthrottledTags,
            meta: {
                "gwmac": data.gw_mac,
                "timestamp": "" + data.timestamp,
                "coordinates": data.coordinates === "" ? "N/A" : data.coordinates,
                "tags": JSON.stringify(tagIds)
            }
        };

        // Kinesis params
        var params = {
            Data: JSON.stringify(dataPacket),
            PartitionKey: 'TestPartition',
            StreamName: process.env.STREAM_NAME
        };

        async function sendUpdate (params) {
            return kinesis.putRecord(params).promise();
        }

        const res = await sendUpdate(params);

        if (!res.ShardId || !res.SequenceNumber) {
            console.error(res);
            return gatewayHelper.invalid();
        }
    } catch (e) {
        console.error(e);
        return gatewayHelper.invalid();
    }

    // Include the gateway request rate by default
    return gatewayHelper.ok(null, {
        [gatewayHelper.RequestRateHeader] : process.env.GATEWAY_SEND_RATE
    });
};
