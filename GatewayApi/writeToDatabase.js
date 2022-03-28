const AWS = require('aws-sdk');
const validator = require('../Helpers/validator');
const dynamo = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const dynamoHelper = require('../Helpers/dynamoHelper');
const throttleHelper = require('../Helpers/throttleHelper');
const kinesisHelper = require('../Helpers/kinesisHelper');
const kinesisWrapper = require('../Helpers/wrapper').kinesisWrapper;

exports.handler = async (event) => kinesisWrapper(processKinesisQueue, event);

const processKinesisQueue = async (event) => {
  const whitelistTableName = process.env.WHITELIST_TABLE_NAME;
  const interval = parseInt(process.env.MAXIMUM_STORAGE_INTERVAL - 5);
  const dataTTL = parseInt(process.env.DATA_TTL);
  const now = validator.now();

  function sendBatch (data) {
    const batch = dynamoHelper.getDynamoBatch(data, process.env.TABLE_NAME);

    return dynamo.batchWriteItem(batch, function (err, data) {
      if (err) {
        console.error('Error', err);
      }
    }).promise().catch((error) => {
      console.error(error);
    });
  }

  const uploadBatchPromises = [];
  const batchedIds = []; // For deduplication

  const loggedGateways = [];
  let uploadedBatches = 0;
  let uploadedRecords = 0;

  // Flatten into an array
  let flattenedData = [];

  for (const fullRecord of event.Records) {
    const recordData = kinesisHelper.getData(fullRecord);
    const {
      data,
      meta
    } = recordData;

    if (!meta.gwmac) {
      console.error("Error! No 'gwmac' present.", meta);
      continue;
    }

    const gwmac = meta.gwmac;

    // -- INSTRUMENT PLACEHOLDER --
    if (!loggedGateways.includes(gwmac)) {
      console.info('GW: ' + gwmac);
      loggedGateways.push(gwmac);
    }

    const coordinates = meta.coordinates;
    const timestamp = meta.timestamp;

    const sensors = data;

    await Promise.all(Object.keys(sensors).map(async (key) => {
      // Dedupe
      if (batchedIds.includes(key + ',' + sensors[key].timestamp)) {
        console.info('Deduped ' + key);
        return;
      }

      const throttleSensor = await throttleHelper.throttle('writer:' + key, interval);
      if (throttleSensor) {
        return;
      }
      if (interval > 100) {
        console.info('SD: ' + key);
      }

      sensors[key].id = key;
      sensors[key].gwmac = gwmac;
      sensors[key].coordinates = coordinates;
      sensors[key].received = timestamp;

      if (dataTTL > 0) {
        sensors[key].ttl = Math.ceil(now + dataTTL);
      }

      flattenedData.push(sensors[key]);
      batchedIds.push(key + ',' + sensors[key].timestamp);

      if (flattenedData.length >= 25) {
        uploadBatchPromises.push(sendBatch(flattenedData));
        flattenedData = [];
        uploadedBatches++;
        uploadedRecords += flattenedData.length;
      }
    }));
  }

  if (flattenedData.length > 0) {
    uploadBatchPromises.push(sendBatch(flattenedData));
    uploadedBatches++;
    uploadedRecords += flattenedData.length;
  }

  // Log the last seen for all gateways
  if (loggedGateways.length > 0) {
    for (const gwmac of loggedGateways) {
      const params = {
        TableName: whitelistTableName,
        ExpressionAttributeNames: {
          '#L': 'Latest'
        },
        ExpressionAttributeValues: {
          ':l': {
            N: now.toString()
          }
        },
        Key: {
          GatewayId: {
            S: gwmac
          }
        },
        UpdateExpression: 'SET #L = :l'
      };

      // If first time we actually accept, store timestamp.
      const gwData = await dynamoHelper.getGatewayData(gwmac, ['Connected']);
      if (gwData.length === 0 || !parseInt(gwData[0].Connected)) {
        params.ExpressionAttributeNames['#N'] = 'Connected';
        params.ExpressionAttributeValues[':n'] = { N: now.toString() };
        params.UpdateExpression += ', #N = :n';
      }

      const updateLatest = dynamo.updateItem(params, function (err, data) {
        if (err) {
          console.error('Error', err);
        }
      }).catch((error) => {
        console.error(error);
      });

      uploadBatchPromises.push(updateLatest);
    }
  }

  // Note: async's in Lambdas should always be awaited as exiting the function
  // pauses the execution context and there is no guarantee that the same one
  // will be resumed in the future.
  await Promise.all(uploadBatchPromises).catch(function (err) {
    console.error(err);
    return false;
  });

  console.log(JSON.stringify({
    queueRecords: event.Records.length,
    batches: uploadedBatches,
    records: uploadedRecords
  }));

  return true;
};
