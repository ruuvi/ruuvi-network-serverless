const AWS = require('aws-sdk');
const validator = require('../Helpers/validator');
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const dynamoHelper = require('../Helpers/dynamoHelper');
const redis = require('../Helpers/redisHelper').getClient();
//const dataHelper = require('../Helpers/sensorDataHelper');

exports.handler = async (event) => {
    console.log(event);

    const interval = parseInt(process.env.MAXIMUM_STORAGE_INTERVAL);
    const dataTTL = parseInt(process.env.DATA_TTL);
    const now = validator.now();

    function sendBatch(data) {
        const batch = dynamoHelper.getDynamoBatch(data, process.env.TABLE_NAME);

        return dynamo.batchWriteItem(batch, function(err, data) {
            if (err) {
                console.error("Error", err);
            }
        }).promise();
    }

    let uploadBatchPromises = [];
    let batchedIds = []; // For deduplication

    let loggedGateways = [];
    let uploadedBatches = 0;
    let uploadedRecords = 0;

    // Flatten into an array
    let flattenedData = [];

    for (const { messageId, body, messageAttributes } of event.Records) {
        if (!messageAttributes.gwmac) {
            console.error("Error! No 'gwmac' present.", messageAttributes);
            continue;
        }

        const gwmac = messageAttributes.gwmac.stringValue;

        // -- INSTRUMENT PLACEHOLDER --
        if (!loggedGateways.includes(gwmac)) {
            console.info("GW: " + gwmac);
            loggedGateways.push(gwmac);
        }

        const coordinates = messageAttributes.coordinates.stringValue;
        const timestamp = messageAttributes.timestamp.stringValue;

        let sensors = JSON.parse(body);

        await Promise.all(Object.keys(sensors).map(async (key) => {
            // Dedupe
            if (batchedIds.includes(key + "," + sensors[key]['timestamp'])) {
                console.info("Deduped " + key);
                return;
            }

            // Throttling
            if (interval > 0) {
                const throttleVar = await redis.get("throttle_" + key);
                const itemTimestamp = parseInt(throttleVar);
                if (itemTimestamp > 0 && itemTimestamp > now - interval) {
                    console.info("Throttled " + key);
                    return;
                }
            }
    
            sensors[key].id = key;
            sensors[key].gwmac = gwmac;
            sensors[key].coordinates = coordinates;
            sensors[key].received = timestamp;

            if (dataTTL > 0) {
                sensors[key].ttl = Math.ceil(now + dataTTL);
            }

            flattenedData.push(sensors[key]);
            batchedIds.push(key + "," + sensors[key]['timestamp']);

            if (flattenedData.length >= 25) {
               uploadBatchPromises.push(sendBatch(flattenedData));
               flattenedData = [];
               uploadedBatches ++;
               uploadedRecords += flattenedData.length;
            }
        }));
    }

    if (flattenedData.length > 0) {
        uploadBatchPromises.push(sendBatch(flattenedData));
        uploadedBatches ++;
        uploadedRecords += flattenedData.length;
    }

    // Note: async's in Lambdas should always be awaited as exiting the function
    // pauses the execution context and there is no guarantee that the same one
    // will be resumed in the future.
    await Promise.all(uploadBatchPromises);

    console.log(JSON.stringify({
        queueRecords: event.Records.length,
        batches: uploadedBatches,
        records: uploadedRecords
    }));

    return `queueRecords: ${event.Records.length}, batches: ${uploadedBatches}, records: ${uploadedRecords}`;
};
