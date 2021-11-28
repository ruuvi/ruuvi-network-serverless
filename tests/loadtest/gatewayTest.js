/**
 * Runs a load test against the given end-point
 */
const loadtest = require('loadtest');
const fs = require('fs');
const yargs = require('yargs');
const { measureMemory } = require('vm');
const urlLib = require('url');
const { exit } = require('process');
const hexCharacters = '0123456789ABCDEF';

function randomId (length) {
  let result = '';
  const charactersLength = hexCharacters.length;
  for (let i = 0; i < length; i++) {
    result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
    result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function randomData (length) {
  let result = '';
  const charactersLength = hexCharacters.length;
  result += '0201041BFF990405';
  for (let i = 0; i < length; i++) {
    result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
    result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const argv = yargs
  .config('target', function (configPath) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  })
  .config('spec', function (specPath) {
    return JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  })
  .option('url', {
    alias: 'u',
    description: 'End point URL',
    type: 'string'
  })
  .help()
  .alias('help', 'h')
  .argv;

const options = {
  url: 'https://localhost/',
  concurrency: 1,
  method: 'POST',
  body: '',
  requestsPerSecond: 1,
  maxSeconds: 2,
  measurementsPerRequest: 5,
  requestGenerator: (params, options, client, callback) => {
    options.headers['Content-Type'] = 'application/json';

    const measurements = {};
    for (let i = 0; i < params.measurementsPerRequest; i++) {
      measurements['AEDDDDDDDD' + randomId(1)] = {
        rssi: -76,
        timestamp: Date.now(),
        data: randomData(24)
      };
    }

    options.body = JSON.stringify({
      data:	{
        coordinates: '',
        timestamp: Date.now(),
        gwmac: '240ac4e32eb4',
        tags: measurements
      }
    });
    options.headers['Content-Length'] = options.body.length;

    const request = client(options, callback);
    request.write(options.body);

    return request;
  }
};

const mergedOptions = Object.assign({}, options, argv);

loadtest.loadTest(mergedOptions, (error, results) => {
  if (error) {
    return console.error('Got an error: %s', error);
  }
  console.log(results);
});
