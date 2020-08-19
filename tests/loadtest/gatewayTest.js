/**
 * Runs a load test against the given end-point
 */
const loadtest = require('loadtest');
const fs = require('fs');
const yargs = require('yargs');
const { measureMemory } = require('vm');
const urlLib = require('url');

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
    .option('url', {
        alias: 'u',
        description: 'End point URL',
        type: 'string',
    })
    .help()
    .alias('help', 'h')
    .argv;

const options = {
	url: 'https://smart-sensor-server.ruuvi.torqhub.io/ruuvi-station?ApiKey=zpIg%2FEzHA3zLgKYQuRQvjmOa0klKr%2FXoB0UIDxLQil7zu62l0DP8b0bIVKmtuApLTPm9mRrd7X72pkso2xs8pLCLYvZzOyRa1qf15ojoTydpmNh%2FD4VDNBG07z49JBQw',
	concurrency: 1,
	method: 'POST',
	body: '',
    requestsPerSecond: 1,
    maxSeconds: 2,
    measurementsPerRequest: 5,
	requestGenerator: (params, options, client, callback) => {
        options.headers['Content-Type'] = 'application/json';

        let measurements = {};
        for (let i = 0; i < params.measurementsPerRequest; i++) {
            measurements["AE" + randomId(6)] = {
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
