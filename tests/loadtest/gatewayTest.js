/**
 * Runs a load test against the given end-point
 */
const loadtest = require('loadtest');
const fs = require('fs');
const yargs = require('yargs');
const { measureMemory } = require('vm');

function randomId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

const argv = yargs
    .config('settings', function (configPath) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    })
    .option('endpoint', {
        alias: 'e',
        description: 'End point URL',
        type: 'string',
    })
    .help()
    .alias('help', 'h')
    .argv;

const options = {
	url: 'http://localhost',
	concurrency: 5,
	method: 'POST',
	body: '',
    requestsPerSecond: 1,
    maxSeconds: 1,
    measurementsPerRequest: 20,
	requestGenerator: (params, options, client, callback) => {
        options.headers['Content-Type'] = 'application/json';
        
        let measurements = {};
        for (let i = 0; i < options.measurementsPerRequest; i++) {
            measurements["TE" + randomId(6)] = {
                "rssi": -76,
                "timestamp": Date.now(),
                "data": "02011A020A0C0AFF4C001005031C6E57DD"
            }
        }

		options.body = JSON.stringify({
            "data":	{
                "coordinates": "",
                "timestamp": Date.now(),
                "gwmac": "240ac4e32eb4",
                "tags": measurements
            }
        });
		options.headers['Content-Length'] = options.body.length;

        options.path = '/dev/record';
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
	console.log('Tests run successfully');
});