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
const { debug } = require('console');

const baseURL = stageConfig[stage]['url'];
const primaryToken = stageConfig[stage]['primary'];
const secondaryToken = stageConfig[stage]['secondary'];
const RI = process.env.IS_INTEGRATION_TEST;
const primaryEmail = stageConfig[stage]['primaryEmail'];
const secondaryEmail = stageConfig[stage]['secondaryEmail'];
const unregisteredEmail = 'muhweli@gmail.com';
const internalKey = stageConfig[stage]['internal'];

/**
 * HTTP Client with Authorization set up
 */
const instance = axios.create({
	baseURL: baseURL,
	timeout: 3000,
	headers: {
		Authorization: `Bearer ${primaryToken}`,
		//'X-Internal-Secret': internalKey  // TODO: This currently fails CORS using Axios
	}
});

/**
 * HTTP Client with Authorization set up
 */
const secondaryHttp = axios.create({
	baseURL: baseURL,
	timeout: 3000,
	headers: {
		Authorization: `Bearer ${secondaryToken}`,
		//'X-Internal-Secret': internalKey  // TODO: This currently fails CORS using Axios
	}
});

/**
 * Perform GET call to the back-end
 *
 * @param {string} endpoint
 * @param {object} queryParams
 */
const get = async (endpoint, queryParams, client = null) => {
	client = client ? client : instance;
	return await client.get('/' + endpoint + '?' + querystring.stringify(queryParams))
}

/**
 * Performs a POST call to the back-end
 *
 * @param {string} endpoint
 * @param {object} body
 */
const post = async (endpoint, body, client = null) => {
	client = client ? client : instance;
	return await client.post('/' + endpoint, body)
}

// Set up some defaults
const newSensorMac = utils.randomMac();
const newGatewayMac = utils.randomMac();
const testData = utils.randomHex(32);

// Verifiable test e-mail here would be best
const newEmail = utils.randomHex(8) + '@' + utils.randomHex(8) + '.com';

let registrationToken = null;

describe('Full integration tests', () => {
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
			email: unregisteredEmail
		});
		expect(registerResult.status).toBe(200);
		expect(registerResult.statusText).toBe('OK');
		expect(registerResult.token).not.toBeNull();
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

	// itif(RI)('`verify` succeeds with valid token', async () => {
	// 	// DEPENDENCY: This verifies previous test
	// 	expect(registrationToken).not.toBeNull();

	// 	// toThrow failed for some reason [temporary workaround]
	// 	let threw = false;
	// 	const verifyResult = await get('verify', {
	// 		token: registrationToken
	// 	});

	// 	expect(verifyResult.status).toBe(200);
	// 	expect(verifyResult.statusText).toBe('OK');

	// 	// TODO: We could do remainder of the tests with this user
	// });

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

	itif(RI)('`record` triggers a throttle when updated with same gateway', async () => {
		let tags = {};
		tags[newSensorMac] = {
			"rssi":	-76,
			"timestamp":	Date.now() - 50,
			"data": '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E'
		};

		try {
			await post('record', {
				"data":	{
					"coordinates":	"",
					"timestamp": Date.now(),
					"gw_mac": newGatewayMac,
					"tags":	tags
				}
			});

			const recordResult = await post('record', {
				"data":	{
					"coordinates":	"",
					"timestamp": Date.now(),
					"gw_mac": newGatewayMac,
					"tags":	tags
				}
			});
		} catch (e) {
			expect(e.response.status).toBe(429); // Throttled
			expect(e.response.data.code).toBe('ER_THROTTLED');
		}
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
	itif(RI)('`get` returns dense sensor data', async () => {
		const sensorData = await get('get', { sensor: newSensorMac, mode: 'dense' })
		expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
		expect(sensorData.data.data.measurements[0].data).toBe(testData);
	});

	// This might fail if SQS processing above is slow
	itif(RI)('`get` returns sparse sensor data', async () => {
		const sensorData = await get('get', { sensor: newSensorMac, mode: 'sparse' })
		expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
		expect(sensorData.data.data.measurements[0].data).toBe(testData);
	});

	// This might fail if SQS processing above is slow
	itif(RI)('`get` returns mixed sensor data (only validates argument)', async () => {
		const sensorData = await get('get', { sensor: newSensorMac, mode: 'mixed' })
		expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
		expect(sensorData.data.data.measurements[0].data).toBe(testData);
	});
	


	itif(RI)('`update` updates sensor data', async () => {
		const testName = 'awesome test sensor';
		const updateResult = await post('update', {
			sensor: newSensorMac,
			name: testName,
			public: 0,
			offsetTemperature: 2,
			offsetHumidity: 3,
			offsetPressure: 4,
		});

		expect(updateResult.status).toBe(200);
		expect(updateResult.statusText).toBe('OK');
		expect(updateResult.data.data.name).toBe(testName);
		expect(updateResult.data.data.public).toBe(0);
		expect(updateResult.data.data.offsetTemperature).toBe(2);
		expect(updateResult.data.data.offsetHumidity).toBe(3);
		expect(updateResult.data.data.offsetPressure).toBe(4);

		// Test successful update
		const updatedSensorData = await get('get', { sensor: newSensorMac });
		expect(updatedSensorData.data.data.name).toBe(testName);
		expect(updatedSensorData.data.data.public).toBe(0);
		expect(updatedSensorData.data.data.offsetTemperature).toBe(2);
		expect(updatedSensorData.data.data.offsetHumidity).toBe(3);
		expect(updatedSensorData.data.data.offsetPressure).toBe(4);
	});

	itif(RI)('`update` updating sensor public flag', async () => {
		const updateResult = await post('update', {
			sensor: newSensorMac,
			public: 1
		});
		expect(updateResult.status).toBe(200);
		expect(updateResult.statusText).toBe('OK');
		expect(updateResult.data.data.public).toBe(1);

		// Verify
		const updatedSensorData = await get('get', { sensor: newSensorMac });
		expect(updatedSensorData.data.data.public).toBe(1);

		const resetPublicFlagResult = await post('update', {
			sensor: newSensorMac,
			public: 0
		});
		expect(resetPublicFlagResult.status).toBe(200);
		expect(resetPublicFlagResult.statusText).toBe('OK');
		expect(resetPublicFlagResult.data.data.public).toBe(0);
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

	itif(RI)('`upload` reset gets an empty image URL and guid', async () => {
		const uploadLinkResult = await post('upload', {
			sensor: newSensorMac,
			type: 'image/png',
			action: 'reset'
		});
		expect(uploadLinkResult.status).toBe(200);
		expect(uploadLinkResult.statusText).toBe('OK');
		expect(uploadLinkResult.data.data.uploadURL).toBe('');
		expect(uploadLinkResult.data.data.uploadURL).toBe('');
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
		expect(sharedSensorData.sharedTo).toBe(secondaryEmail);
	});

	itif(RI)('`sensors` returns the proper response with shared and unshared sensors', async () => {
		const sensorData = await get('sensors');

		expect(sensorData.data.data.sensors).not.toBeNull();
		expect(sensorData.data.data.sensors[newSensorMac].sharedTo.length).toBe(1);

	});

	itif(RI)('`sensors` works filtered to a single sensor', async () => {
		const sensorData = await get('sensors', {
			sensor: newSensorMac
		});
		expect(sensorData.data.data.sensors[newSensorMac]).not.toBeNull();
		expect(sensorData.data.data.sensors[newSensorMac].sharedTo.length).toBe(1);
		expect(sensorData.data.data.sensors[newSensorMac].sharedTo[0]).toBe(secondaryEmail);
	});

	itif(RI)('`share` to unregistered is successful', async () => {
		const shareResult = await post('share', {
			sensor: newSensorMac,
			user: unregisteredEmail
		});

		expect(shareResult.status).toBe(200);
		expect(shareResult.statusText).toBe('OK');
		expect(shareResult.data.result).toBe('success');

		expect(shareResult.data.data.sensor).toBe(newSensorMac);
	});

	// DEPENDENT ON THE ABOVE
/*	itif(RI)('`unshare` is successful', async () => {
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

	itif(RI)('`unshare` by sharee is successful', async () => {
		const shareResult = await post('share', {
			sensor: newSensorMac,
			user: secondaryEmail
		});

		expect(shareResult.status).toBe(200, 'Share step');

		const unshareResult = await post('unshare', {
			sensor: newSensorMac
		}, secondaryHttp);

		expect(unshareResult.status).toBe(200);
		expect(unshareResult.statusText).toBe('OK');
		expect(unshareResult.data.result).toBe('success');

		const userShareData = await get('shared');
		expect(userShareData.data.data.sensors.length).toBe(0);
	});*/

	itif(RI)('creating an alert is successful', async () => {
		const createResult = await post('alerts', {
			sensor: newSensorMac,
			type: 'humidity',
			min: 30,
			max: 100,
			enabled: true
		});
		expect(createResult.status).toBe(200, 'Create');

		// Validate existence
		const readResult = await get('alerts', {
			sensor: newSensorMac
		});
		expect(readResult.status).toBe(200, 'Read');
		expect(readResult.data.data[newSensorMac].length).toBe(1);

		const alerts = readResult.data.data[newSensorMac];
		expect(alerts[0].max).toBe(100);
		expect(alerts[0].min).toBe(30);
		expect(alerts[0].triggered).toBe(false);
		expect(alerts[0].enabled).toBe(true);
		expect(alerts[0].type).toBe('humidity');
	});

	itif(RI)('Updating an alert is successful', async () => {
		const updateResult = await post('alerts', {
			sensor: newSensorMac,
			type: 'humidity',
			min: 20,
			max: 50,
			enabled: false
		});
		expect(updateResult.status).toBe(200, 'Update');

		// Validate existence
		const readResult = await get('alerts', {
			sensor: newSensorMac
		});
		expect(readResult.status).toBe(200, 'Read');
		expect(readResult.data.data[newSensorMac].length).toBe(1);

		const alerts = readResult.data.data[newSensorMac];
		expect(alerts[0].max).toBe(50);
		expect(alerts[0].min).toBe(20);
		expect(alerts[0].enabled).toBe(false);
	});

	itif(RI)('triggering a min limit alert is successful', async () => {
		// Setup
		const alertSensorMac = utils.randomMac();
		const alertGatewayMac = utils.randomMac();

		try {
			await post('claim', {
				sensor: alertSensorMac
			});

			await post('alerts', {
				sensor: alertSensorMac,
				type: 'temperature',
				min: 25,
				max: 30,
				enabled: true
			});
		} catch (e) {
			expect(true).toBe(false, 'Failed to create alert');
		}

		// Create request
		let tags = {};
		tags[alertSensorMac] = {
			"rssi":	-76,
			"timestamp":	Date.now() - 50,
			// Has temperature of 20.505 degrees
			"data": '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E'
		};

		try {
			await post('record', {
				"data":	{
					"coordinates":	"",
					"timestamp": Date.now(),
					"gw_mac": alertGatewayMac,
					"tags":	tags
				}
			});
		} catch (e) {
			console.log(e);
			expect(true).toBe(false, 'Failed to post data for triggering alert');
		}

		// Validate alert
		const readResult = await get('alerts', {
			sensor: alertSensorMac
		});

		expect(readResult.status).toBe(200, 'Read');
		expect(readResult.data.data[alertSensorMac].length).toBe(1);

		const alerts = readResult.data.data[alertSensorMac];
		expect(alerts[0].triggered).toBe(true);
		expect(alerts[0].triggeredAt).toMatch(/^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9])(?:(T [0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?/);
	});

	itif(RI)('triggering a max limit alert on a sensor with offset is successful', async () => {
		// Setup
		const alertSensorMac = utils.randomMac();
		const alertGatewayMac = utils.randomMac();

		try {
			await post('claim', {
				sensor: alertSensorMac
			});

			// Set offset to 30 to push the test humidity over the edge (to 66.325)
			await post('update', {
				sensor: alertSensorMac,
				name: 'sensor with humidity offset',
				offsetHumidity: 30
			});

			// Alert range between 25-50, test point 36.325
			await post('alerts', {
				sensor: alertSensorMac,
				type: 'humidity',
				min: 25,
				max: 50,
				enabled: true
			});
		} catch (e) {
			expect(true).toBe(false, 'Failed to create alert');
		}

		// Create request
		let tags = {};
		tags[alertSensorMac] = {
			"rssi":	-76,
			"timestamp":	Date.now() - 50,
			// Has humidity of 36.325
			"data": '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E'
		};

		try {
			await post('record', {
				"data":	{
					"coordinates":	"",
					"timestamp": Date.now(),
					"gw_mac": alertGatewayMac,
					"tags":	tags
				}
			});
		} catch (e) {
			console.log(e);
			expect(true).toBe(false, 'Failed to post data for triggering alert');
		}

		// Validate alert
		const readResult = await get('alerts', {
			sensor: alertSensorMac
		});

		expect(readResult.status).toBe(200, 'Read');
		expect(readResult.data.data[alertSensorMac].length).toBe(1);

		const alerts = readResult.data.data[alertSensorMac];
		expect(alerts[0].triggered).toBe(true);
		expect(alerts[0].triggeredAt).toMatch(/^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9])(?:(T [0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?/);
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

	itif(RI)('`settings` insert is successful', async () => {
		const randomKey = utils.randomHex(16);
		const randomValue = utils.randomHex(16);

		const settingsResult = await post('settings', {
			name: randomKey,
			value: randomValue
		});

		expect(settingsResult.status).toBe(200, 'Insert step');
		expect(settingsResult.data.data.action).toBe('added');
	});

	itif(RI)('`settings` read is successful', async () => {
		// Create a new key
		const randomKey = utils.randomHex(16);
		const randomValue = utils.randomHex(16);

		const settingsResult = await post('settings', {
			name: randomKey,
			value: randomValue
		});
		expect(settingsResult.status).toBe(200, 'Insert step');

		// Read new key
		const getSettingsResult = await get('settings');
		expect(getSettingsResult.status).toBe(200, 'Read step');
		expect(getSettingsResult.data.data.settings[randomKey]).toBe(randomValue);
	});

	itif(RI)('`settings` update is successful', async () => {
		// Create a new key
		const randomKey = utils.randomHex(16);
		const randomValue = utils.randomHex(16);

		const settingsResult = await post('settings', {
			name: randomKey,
			value: randomValue
		});
		expect(settingsResult.status).toBe(200, 'Insert step');

		// Update new key
		const updatedRandomValue = utils.randomHex(16);

		const updateSettingsResult = await post('settings', {
			name: randomKey,
			value: updatedRandomValue
		});
		expect(updateSettingsResult.status).toBe(200, 'Update step');

		const getUpdatedSettingsResult = await get('settings');
		expect(getUpdatedSettingsResult.status).toBe(200, 'Read step');
		expect(getUpdatedSettingsResult.data.data.settings[randomKey]).toBe(updatedRandomValue);
	});
});


