/**
 * @jest-environment node
 */

/**
 * General test suite for the back-end.
 */
const {
	utils,

	itif,
    get,
    post,

	RI,
    
	internalHttp,
	secondaryHttp,
	httpWithInvalidSignature,

    primaryEmail,
    secondaryEmail,
    unregisteredEmail,

	sleep
} = require('./common');
const { randomMac, randomHex } = require('./integrationHelpers');
const errorCodes = require('../../Helpers/errorCodes.js');

// Set up some defaults
const newSensorMac = utils.randomMac();
const newGatewayMac = utils.randomMac();
const testData = utils.randomHex(32);

// Verifiable test e-mail here would be best
const newEmail = utils.randomHex(8) + '@' + utils.randomHex(8) + '.com';
let registrationToken = null;

const maxClaims = 25;

describe('Full integration tests', () => {
	// INTERNAL
	itif(RI)('`whitelist` without internal token fails', async () => {

		// toThrow failed for some reason [temporary workaround]
		let threw = false;
		try {
			await post('whitelist', {
				macAddress: "ab:ba:cd:ba:ca:ba",
				secret: "1234"
			});
		} catch (e) {
			expect(e.message).toMatch(/Request failed with status code 403/);
			threw = true;
		}
		expect(threw).toBe(true);
	});

	itif(RI)('`whitelist` with internal token succeeds', async () => {
		const newGwMac = randomMac();

		let tags = {};
		tags[newSensorMac] = {
			"rssi":	-76,
			"timestamp": Date.now() - 50,
			"data":	testData
		};

		let rejected = false;
		try {
			await post('record', {
				"data":	{
					"coordinates": "",
					"timestamp": Date.now(),
					"gw_mac": newGwMac,
					"tags":	tags
				}
			}, httpWithInvalidSignature);
		} catch (e) {
			rejected = true;
		}
		expect(rejected).toBe(true, 'rejected signature');

		await sleep(1000);

		const result = await post('whitelist', {
			macAddress: newGwMac,
			secret: randomHex(64)
		}, internalHttp);

		expect(result.status).toBe(200);
		expect(result.data.data.gateway.macAddress).toBe(newGwMac);

		// Attempt to blacklist
		const blacklistResult = await post('blacklist', {
			macAddress: newGwMac
		}, internalHttp);

		expect(blacklistResult.status).toBe(200);
		expect(blacklistResult.data.data.gateway).toBe(newGwMac);
		console.log(blacklistResult.data.data.gateway);
	});

	itif(RI)('`whitelist` with already whitelisted fails', async () => {
		const newGwMac = randomMac();

		let tags = {};
		tags[newSensorMac] = {
			"rssi":	-76,
			"timestamp": Date.now() - 50,
			"data":	testData
		};

		let rejected = false;
		try {
			await post('record', {
				"data":	{
					"coordinates": "",
					"timestamp": Date.now(),
					"gw_mac": newGwMac,
					"tags":	tags
				}
			}, httpWithInvalidSignature);
		} catch (e) {
			rejected = true;
		}

		await sleep(1000);

		const result = await post('whitelist', {
			macAddress: newGwMac,
			secret: randomHex(64)
		}, internalHttp);

		expect(result.status).toBe(200);
		expect(result.data.data.gateway.macAddress).toBe(newGwMac);

		let thrown = false;
		try {
			const result = await post('whitelist', {
				macAddress: newGwMac,
				secret: randomHex(64)
			}, internalHttp);
		} catch (e) {
			expect(e.response.status).toBe(409);
			expect(e.response.data.code).toBe(errorCodes.ER_GATEWAY_ALREADY_WHITELISTED);
			thrown = true;
		}
		expect(thrown).toBe(true);
	});

	itif(RI)('`whitelist` on unseen gateway fails', async () => {
		const newGwMac = randomMac();

		let thrown = false;

		try {
			const result = await post('whitelist', {
				macAddress: newGwMac,
				secret: randomHex(64)
			}, internalHttp);
		} catch (e) {
			expect(e.response.status).toBe(409);
			expect(e.response.data.result).toBe('error');
			expect(e.response.data.code).toBe(errorCodes.ER_GATEWAY_NOT_FOUND);
			expect(e.response.data.error).toBe('Request was valid, but gateway has not been seen yet.');
			thrown = true;
		}
		expect(thrown).toBe(true);
	});

//	itif(RI)('`gwinfo` returns data for whitelisted gateway', async () => {
//		const newGWMac = randomMac();
//		const whitelistResult = await post('whitelist', {
//			macAddress: newGWMac,
//			secret: randomHex(64)
//		}, internalHttp);
//		expect(whitelistResult.status).toBe(200, 'successfully whitelisted');
//
//      TODO: SEND UPDATE FROM GW
//
//		const gwinfoResult = await get('gwinfo', {
//			gateway: newGWMac
//		}, internalHttp);
//
//		expect(gwinfoResult.status).toBe(200);
//		expect(gwinfoResult.data.data.gateway.GatewayId).toBe(newGWMac);
//		expect(gwinfoResult.data.data.gateway.InvalidSignatureTimestamp).toBe(0);
//		expect(gwinfoResult.data.data.gateway.Connected).toBe(0);
//		expect(gwinfoResult.data.data.gateway.Latest).toBe(0);
//		expect(gwinfoResult.data.data.gateway.Whitelisted).toBe(0);
//	});

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

			await post('record', {
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

	itif(RI)('`claim` on already claimed returns 409 Conflict', async () => {
		let caught = false;
		try {
			const claimResult = await post('claim', {
				sensor: newSensorMac
			}, secondaryHttp);
		} catch (e) {
			expect(e.message).toMatch(/Request failed with status code 409/);

			const maskEmail = require('../../Helpers/emailHelper').maskEmail;
			const maskedEmail = maskEmail(primaryEmail);

			expect(e.response.data.error).toBe(`Sensor already claimed by ${maskedEmail}.`);
			caught = true;
		}
		expect(caught).toBe(true);
	});

	// This might fail if Kinesis processing above is slow
	itif(RI)('`get` returns dense sensor data', async () => {
		// NOTICE! The data might take a little bit to go through the stream so we retry a couple of times
		let sensorData = null;

		for (let retry = 0; retry < 3; retry++) {
			sensorData = await get('get', { sensor: newSensorMac, mode: 'dense' })
			if (sensorData.data.data.measurements.length > 0) {
				break;
			}
			await sleep(1000);
		}

		expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
		expect(sensorData.data.data.measurements[0].data).toBe(testData);
	});

	// This might fail if Kinesis processing above is slow
	itif(RI)('`get` returns sparse sensor data', async () => {
		const sensorData = await get('get', { sensor: newSensorMac, mode: 'sparse' })
		expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
		expect(sensorData.data.data.measurements[0].data).toBe(testData);
	});

	// This might fail if Kinesis processing above is slow
	itif(RI)('`get` returns mixed sensor data (only validates argument)', async () => {
		const sensorData = await get('get', { sensor: newSensorMac, mode: 'mixed' })
		expect(sensorData.data.data.measurements.length).toBeGreaterThan(0);
		expect(sensorData.data.data.measurements[0].data).toBe(testData);
	});
	
	itif(RI)('`update` updates sensor data', async () => {
		const testName = 'awesome test sensor';
		const pictureName = 'kek.default.file';
		const updateResult = await post('update', {
			sensor: newSensorMac,
			name: testName,
			public: 0,
			offsetTemperature: 2,
			offsetHumidity: 3,
			offsetPressure: 4,
			picture: pictureName
		});

		expect(updateResult.status).toBe(200);
		expect(updateResult.statusText).toBe('OK');
		expect(updateResult.data.data.name).toBe(testName);
		expect(updateResult.data.data.public).toBe(0);
		expect(updateResult.data.data.offsetTemperature).toBe(2);
		expect(updateResult.data.data.offsetHumidity).toBe(3);
		expect(updateResult.data.data.offsetPressure).toBe(4);
		expect(updateResult.data.data.picture).toBe(pictureName);

		// Test successful update
		const updatedSensorData = await get('get', { sensor: newSensorMac });
		expect(updatedSensorData.data.data.name).toBe(testName);
		expect(updatedSensorData.data.data.public).toBe(0);
		expect(updatedSensorData.data.data.offsetTemperature).toBe(2);
		expect(updatedSensorData.data.data.offsetHumidity).toBe(3);
		expect(updatedSensorData.data.data.offsetPressure).toBe(4);
		expect(updatedSensorData.data.data.picture).toBe(pictureName);
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

	itif(RI)('`update` updates sensor name with unicode (smiley)', async () => {
		const testName = "🤩";
		const updateResult = await post('update', {
			sensor: newSensorMac,
			name: testName,
		});

		expect(updateResult.status).toBe(200);
		expect(updateResult.statusText).toBe('OK');
		expect(updateResult.data.data.name === testName).toBe(true);

		// Test successful update
		const updatedSensorData = await get('get', { sensor: newSensorMac });
		expect(updatedSensorData.data.data.name === testName).toBe(true);
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
		const newSensor = sensorData.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor.sharedTo.length).toBe(1);

	});

	itif(RI)('`sensors` works filtered to a single sensor', async () => {
		const sensorData = await get('sensors', {
			sensor: newSensorMac
		});
		
		const newSensor = sensorData.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor).not.toBeNull();
		expect(newSensor.sharedTo.length).toBe(1);
		expect(newSensor.sharedTo[0]).toBe(secondaryEmail);
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

	itif(RI)('can `claim` maximum for subscription', async () => {
		const sensorData = await get('sensors');
		const existingSensors = sensorData.data.data.sensors.length;

		let sensors = [];
		let threw = false;
		let i = 0;
		try {
			for (i = 0; i < maxClaims - existingSensors; i++) {
				const successfulSensor = randomMac();
				const claimResult = await post('claim', {
					sensor: successfulSensor,
					description: `Success ${i}`
				});
				expect(claimResult.status).toBe(200);
				expect(claimResult.statusText).toBe('OK');
				sensors.push(successfulSensor);
			}
		} catch (e) {
			console.error(`Error at claiming index ${i}`, e);
			threw = true;
		}
		expect(threw).toBe(false, 'Claim until max claims');

		let claimResult = 0;
		try {
			const unsuccessfulSensor = randomMac();
			await post('claim', {
				sensor: unsuccessfulSensor
			});
		} catch (e) {
			claimResult = e.response.status;
			//console.log(e);
		}

		// Clean up
		let cleanupError = false;
		for (const sensor of sensors) {
			try {
				const unclaimResult = await post('unclaim', {
					sensor: sensor
				});
				expect(unclaimResult.status).toBe(200);
				expect(unclaimResult.statusText).toBe('OK');	
			} catch (e) {
				console.error('Error', e);
				cleanupError = true;
			}
			expect(cleanupError).toBe(false, 'clean up error');
		}

		expect(claimResult).toBe(400);
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


