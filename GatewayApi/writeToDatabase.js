const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const dynamoHelper = require('../Helpers/dynamoHelper');

exports.handler = async (event) => {
    // Flatten into an array
    let flattenedData = [];

    function sendBatch(data) {
         const batch = dynamoHelper.getDynamoBatch(data);
            
        return dynamo.batchWriteItem(batch, function(err, data) {
            if (err) {
                console.error("Error", err);
            }
        }).promise();
    }
    
    let uploadBatchPromises = [];
    let batchedIds = []; // For deduplication
    
    for (const { messageId, body, messageAttributes } of event.Records) {
        const gwmac = messageAttributes.gwmac.stringValue;
        const coordinates = messageAttributes.coordinates.stringValue;
        const timestamp = messageAttributes.timestamp.stringValue;

        let tags = JSON.parse(body);

        Object.keys(tags).forEach(function(key) {
            // Dedupe
            if (batchedIds.includes(key + "," + tags[key]['timestamp'])) {
                return;
            }
            tags[key].id = key;
            tags[key].gwmac = gwmac;
            tags[key].coordinates = coordinates;
            tags[key].received = timestamp;
            
            flattenedData.push(tags[key]);
            batchedIds.push(key + "," + tags[key]['timestamp']);
            
            if (flattenedData.length >= 25) {
               uploadBatchPromises.push(sendBatch(flattenedData));
               flattenedData = [];
            }
        });
    }
    if (flattenedData.length > 0) {
        uploadBatchPromises.push(sendBatch(flattenedData));
    }
  
    // Note: async's in Lambdas should always be awaited as exiting the function
    // pauses the execution context and there is no guarantee that the same one
    // will be resumed in the future.  
    await Promise.all(uploadBatchPromises);

    return `Successfully processed ${event.Records.length} messages.`;
};
