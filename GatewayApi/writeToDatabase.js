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

  async function sendBatch (data) {
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
      if (parseInt(process.env.DEBUG_MODE) === 1) {
        console.debug('GW: ' + gwmac);
      }
      loggedGateways.push(gwmac);
    }

    const coordinates = meta.coordinates;
    const timestamp = meta.timestamp;

    const sensors = data;
    if (parseInt(process.env.DEBUG_MODE) === 1) {
      console.debug('Processing sensor data');
    }

    await Promise.all(Object.keys(sensors).map(async (key) => {
      // Dedupe
      if (batchedIds.includes(key + ',' + sensors[key].timestamp)) {
        if (parseInt(process.env.DEBUG_MODE) === 1) {
          console.debug('Deduped ' + key);
        }
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
    await sendBatch(flattenedData);
    uploadedBatches++;
    uploadedRecords += flattenedData.length;
  }
  if (parseInt(process.env.DEBUG_MODE) === 1) {
    console.debug('Sensor data processed, processing Gateway status');
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

      await dynamo.updateItem(params, function (err, data) {
        if (err) {
          console.error('Error', err);
        } else if (parseInt(process.env.DEBUG_MODE) === 1) {
          console.debug('updateItem result:' + JSON.stringify(data));
        }
      }).promise().catch((error) => {
        console.error(error);
      });
    }
  }
  if (parseInt(process.env.DEBUG_MODE) === 1) {
    console.debug('Gateway status processed, uploading data to DynamoDB');
  }

  console.log(JSON.stringify({
    queueRecords: event.Records.length,
    batches: uploadedBatches,
    records: uploadedRecords
  }));

  return true;
};
