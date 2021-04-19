const AWS = require('aws-sdk');
const validator = require('../Helpers/validator')
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const dynamoHelper = require('../Helpers/dynamoHelper');
const redisHelper = require('../Helpers/redisHelper');

exports.handler = async (event) => {
    // Flatten into an array
    let flattenedData = [];

    const interval = parseInt(process.env.LONG_TERM_STORAGE_INTERVAL);
    const rawDataTTL = parseInt(process.env.RAW_DATA_TTL);
    const now = validator.now();

    function sendBatch(data, tableName = null) {
        const batch = dynamoHelper.getDynamoBatch(data, tableName);

        return dynamo.batchWriteItem(batch, function(err, data) {
            if (err) {
                console.error("Error", err);
            }
        }).promise();
    }

    /**
     * Sends to DynamoDB if no record for the same sensor is found within given time
     * interval.
     *
     * @param {object} data
     * @param {int} interval
     */
    async function sendIfNotInInterval(data, interval) {
        // TODO: This should be cleaned up
        const clonedData = JSON.parse(JSON.stringify(data));
        if (clonedData.ttl) {
            delete clonedData.ttl;
        }

        const item = await dynamoHelper.fetch(
            process.env.REDUCED_TABLE_NAME,
            'SensorId',
            clonedData.id,
            ['SensorId', 'MeasurementTimestamp'],
            1,
            false,
            'MeasurementTimestamp',
            now - interval
        );

        if (item.length > 0) {
            return false;
        }
        return sendBatch([clonedData], process.env.REDUCED_TABLE_NAME);
    }

    let uploadBatchPromises = [];
    let batchedIds = []; // For deduplication

    let loggedGateways = [];
    let uploadedBatches = 0;
    let uploadedRecords = 0;

    for (const { messageId, body, messageAttributes } of event.Records) {
        const gwmac = messageAttributes.gwmac.stringValue;

        // -- INSTRUMENT PLACEHOLDER --
        if (!loggedGateways.includes(gwmac)) {
            console.info("GW: " + gwmac);
            loggedGateways.push(gwmac);
        }

        const coordinates = messageAttributes.coordinates.stringValue;
        const timestamp = messageAttributes.timestamp.stringValue;

        let sensors = JSON.parse(body);

        Object.keys(sensors).forEach(function(key) {
            // Dedupe
            if (batchedIds.includes(key + "," + sensors[key]['timestamp'])) {
                return;
            }
            sensors[key].id = key;
            sensors[key].gwmac = gwmac;
            sensors[key].coordinates = coordinates;
            sensors[key].received = timestamp;
            sensors[key].ttl = Math.ceil(now + rawDataTTL);

            // TODO: Could use some improved batching here
            uploadBatchPromises.push(sendIfNotInInterval(sensors[key], interval));

            flattenedData.push(sensors[key]);
            batchedIds.push(key + "," + sensors[key]['timestamp']);

            if (flattenedData.length >= 25) {
               uploadBatchPromises.push(sendBatch(flattenedData));
               flattenedData = [];
               uploadedBatches ++;
               uploadedRecords += flattenedData.length;
            }
        });
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

    return `queueRecords: ${event.Records.length}, batches: ${uploadedBatches}, records: ${uploadedRecords}`
};
