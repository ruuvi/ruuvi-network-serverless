const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const dynamoHelper = require('dynamoHelper.js');

exports.handler = async (event) => {
    // Flatten into an array
    let flattenedData = [];
    
    for (const { messageId, body, messageAttributes } of event.Records) {
        const gwmac = messageAttributes.gwmac.stringValue;
        const coordinates = messageAttributes.coordinates.stringValue;
        const timestamp = messageAttributes.timestamp.stringValue;

        let tags = JSON.parse(body);

        Object.keys(tags).forEach(function(key) {
            tags[key].id = key;
            tags[key].gwmac = gwmac;
            tags[key].coordinates = coordinates;
            tags[key].received = timestamp;
            
            flattenedData.push(tags[key]);
        });
    }

    const batch = dynamoHelper.getDynamoBatch(flattenedData);

    // Note: async's in Lambdas should always be awaited as exiting the function
    // pauses the execution context and there is no guarantee that the same one
    // will be resumed in the future.
    await dynamo.batchWriteItem(batch, function(err, data) {
        if (err) {
            console.error("Error", err);
        }
    }).promise();
    
    return `Successfully processed ${event.Records.length} messages.`;
};
