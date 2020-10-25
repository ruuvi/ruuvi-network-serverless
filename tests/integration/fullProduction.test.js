/**
 * Runs a load test against the given end-point
 */
const querystring = require('querystring');
const axios = require('axios');
const utils = require('./integrationHelpers');

// Only run when condition is met; used for skipping tests
const itif = (condition) => condition ? it : it.skip;

// Load configuration
const stage = process.env.STAGE ? process.env.STAGE : 'dev';
const stageConfig = require('./integrationCredentials');

const baseURL = stageConfig[stage]['url'];
const token = stageConfig[stage]['primary'];
const RI = process.env.IS_INTEGRATION_TEST;
const primaryEmail = stageConfig[stage]['primaryEmail'];
const secondaryEmail = stageConfig[stage]['secondaryEmail'];

/**
 * HTTP Client with Authorization set up
 */
const instance = axios.create({
	baseURL: baseURL,
	timeout: 1000,
	headers: { Authorization: `Bearer ${token}`}
});

/**
 * Perform GET call to the back-end
 *
 * @param {string} endpoint
 * @param {object} queryParams
 */
const get = async (endpoint, queryParams) => {
	return await instance.get('/' + endpoint + '?' + querystring.stringify(queryParams))
}

/**
 * Performs a POST call to the back-end
 *
 * @param {string} endpoint
 * @param {object} body
 */
const post = async (endpoint, body) => {
	return await instance.post('/' + endpoint, body)
}

// Set up some defaults
const newSensorMac = utils.randomMac();
const newGatewayMac = utils.randomMac();
const testData = utils.randomHex(32);

// Verifiable test e-mail here would be best
const newEmail = utils.randomHex(8) + '@' + utils.randomHex(8) + '.com';

describe('Full integration tests', () => {
	//console.log('Running tests for: ' + stage);

	// INTERNAL
	itif(RI)('`whitelist` without internal token fails', async () => {

		// toThrow failed for some reason [temporary workaround]
		let threw = false;
		try {
			await post('whitelist', {
				"gateways": [
					{"gatewayId": "abbacd", "deviceId": "1234", "deviceAddr": "5678"},
					{"gatewayId": "bbbace", "deviceId": "abcd", "deviceAddr": "efae"},
					{"gatewayId": "cbbacf", "deviceId": "qwer", "deviceAddr": "aaee"}
				]
			});
		} catch (e) {
			expect(e.message).toMatch(/Request failed with status code 400/);
			threw = true;
		}
		expect(threw).toBe(true);
	});

	// USER
	itif(RI)('`register` returns 200 OK', async () => {
		const registerResult = await post('register', {
			email: newEmail
		});
		expect(registerResult.status).toBe(200);
		expect(registerResult.statusText).toBe('OK');
	});

	itif(RI)('`verify` fails with invalid token', async () => {
		// toThrow failed for some reason [temporary workaround]
		let threw = false;
		try {
			await get('verify', {
				token: 'definitely_faulty_token'
			});
		} catch (e) {
			expect(e.message).toMatch(/Request failed with status code 403/);
			threw = true;
		}
		expect(threw).toBe(true);
	});

	itif(RI)('`record` returns 200 OK', async () => {
		let tags = {};
		tags[newSensorMac] = {
			"rssi":	-76,
			"timestamp":	Date.now() - 50,
			"data":	testData
		};

		const recordResult = await post('record', {
			"data":	{
				"coordinates":	"",
				"timestamp":	Date.now(),
				"gw_mac":	newGatewayMac,
				"tags":	tags
			}
		});
		expect(recordResult.status).toBe(200);
		expect(recordResult.statusText).toBe('OK');
	});

	itif(RI)('`user` returns email', async () => {
		const userData = await get('user');
		expect(userData.data.data.email).toBe(primaryEmail);
	});

	itif(RI)('`claim` returns 200 OK', async () => {
		const claimResult = await post('claim', {
			sensor: newSensorMac
		});
		expect(claimResult.status).toBe(200);
		expect(claimResult.statusText).toBe('OK');
	});

	// This might fail if SQS processing above is slow
	itif(RI)('`get` returns sensor data', async () => {
		const sensorData = await get('get', { sensor: newSensorMac })
		expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
		expect(sensorData.data.data.measurements[0].data).toBe(testData);
	});

	itif(RI)('`update` updates sensor data', async () => {
		const testName = 'awesome test sensor';
		const updateResult = await post('update', {
			sensor: newSensorMac,
			name: testName
		});
		expect(updateResult.status).toBe(200);
		expect(updateResult.statusText).toBe('OK');
		expect(updateResult.data.data.name).toBe(testName);

		// Test successful update
		const updatedSensorData = await get('get', { sensor: newSensorMac })
		expect(updatedSensorData.data.data.name).toBe(testName);
	});

	itif(RI)('`upload` gets an image URL to upload to', async () => {
		const uploadLinkResult = await post('upload', {
			sensor: newSensorMac,
			type: 'image/png'
		});
		expect(uploadLinkResult.status).toBe(200);
		expect(uploadLinkResult.statusText).toBe('OK');
		expect(uploadLinkResult.data.data.uploadURL).toContain('https://');
		expect(uploadLinkResult.data.data.uploadURL).toContain('Content-Type=image%2Fpng&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=');
	});

	itif(RI)('`shared` returns an empty array of sensors', async () => {
		const sensorData = await get('shared');
		expect(sensorData.data.data.sensors.length).toBe(0);
	});

	itif(RI)('`share` is successful', async () => {
		const shareResult = await post('share', {
			sensor: newSensorMac,
			user: secondaryEmail
		});

		expect(shareResult.status).toBe(200);
		expect(shareResult.statusText).toBe('OK');
		expect(shareResult.data.result).toBe('success');

		expect(shareResult.data.data.sensor).toBe(newSensorMac);

		// Verify share being found
		const userShareData = await get('shared');
		expect(userShareData.data.data.sensors.length).toBeGreaterThan(0);

		const sharedSensorData = userShareData.data.data.sensors[0];
		expect(sharedSensorData.sensor).toBe(newSensorMac);
		expect(sharedSensorData.public).toBe(false);
		expect(sharedSensorData.shared_to).toBe(secondaryEmail);
	});

	// DEPENDENT ON THE ABOVE
	itif(RI)('`unshare` is successful', async () => {
		const unshareResult = await post('unshare', {
			sensor: newSensorMac,
			user: secondaryEmail
		});

		expect(unshareResult.status).toBe(200);
		expect(unshareResult.statusText).toBe('OK');
		expect(unshareResult.data.result).toBe('success');

		const userShareData = await get('shared');
		expect(userShareData.data.data.sensors.length).toBe(0);
	});

	itif(RI)('`unclaim` returns 200 OK', async () => {
		const claimResult = await post('unclaim', {
			sensor: newSensorMac
		});
		expect(claimResult.status).toBe(200);
		expect(claimResult.statusText).toBe('OK');

		// toThrow failed for some reason [temporary workaround]
		let threw = false;
		try {
			await get('get', { sensor: newSensorMac });
		} catch (e) {
			expect(e.message).toMatch(/Request failed with status code 403/);
			threw = true;
		}
		expect(threw).toBe(true);
	});
});


