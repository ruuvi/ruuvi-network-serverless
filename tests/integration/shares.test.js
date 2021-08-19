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
    
	secondaryHttp,

    secondaryEmail,
    unregisteredEmail,

	sleep
} = require('./common');
const { randomMac } = require('./integrationHelpers');

// Set up some defaults
const newSensorMac = utils.randomMac();
const newGatewayMac = utils.randomMac();
const testData = utils.randomHex(32);

const createSensorWithData = async (macAddress, gatewayMac, data = null, name = null) => {
    let payload = { sensor: macAddress };
    if (name !== null) {
        payload.name = name;
    }

    if (data === null) {
        data = testData;
    }

    try {
        await post('claim', payload);
    } catch (e) {
        console.error('claim failed', e);
        return false;
    }

    let tags = {};
    tags[macAddress] = {
        "rssi":	-76,
        "timestamp":	Date.now() - 50,
        "data":	data
    };

    let recordResult = null;
    try {
        recordResult = await post('record', {
            "data":	{
                "coordinates":	"",
                "timestamp":	Date.now(),
                "gw_mac":	gatewayMac,
                "tags":	tags
            }
        });
    } catch (e) {
        console.error('failed to record data', e);
    }

    // Wait for data to show up
    let failed = 0;
    for (let i = 0; i < 10; i++) {
        try {
            const readResult = await get('get', { sensor: macAddress });
            if (!readResult.data || !readResult.data.total) {
                await sleep(500);
                continue;
            }
            break;
        } catch (e) {
            failed++;
        }
    }
    if (failed > 0) {
        console.log('failed attempts: ' + failed);
    }

    if (recordResult === null) {
        await post('unclaim', {
			sensor: macAddress
		});
    }
    
    return true;
}

describe('Shares test suite', () => {
	itif(RI)('`claim` and record data is successful (PRE-REQUISITE)', async () => {
		const createDefault = await createSensorWithData(newSensorMac, utils.randomMac());
		expect(createDefault).toBe(true);
	});

	itif(RI)('`shared` returns an empty array of sensors', async () => {
		const sensorData = await get('shared');
		expect(sensorData.data.data.sensors.length).toBe(0);
	});

	itif(RI)('`share` is successful', async () => {
        let shareResult = null;
        try {
            shareResult = await post('share', {
                sensor: newSensorMac,
                user: secondaryEmail
            });
        } catch (e) {
            console.error('share was unsuccessful', e.response.data);
        }

        expect(shareResult).not.toBeNull();
		expect(shareResult.status).toBe(200);
		expect(shareResult.statusText).toBe('OK');
		expect(shareResult.data.result).toBe('success');

		expect(shareResult.data.data.sensor).toBe(newSensorMac);

		// Verify share being found
        let userShareData = null;
        try {
            userShareData = await get('shared');
        } catch (e) {
            console.error('Failed to fetch user data', e.response.data);
        }
		expect(userShareData).not.toBeNull();
		expect(userShareData.data.data.sensors.length).toBeGreaterThan(0);

        const sharedSensorData = userShareData.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(sharedSensorData.sensor).toBe(newSensorMac);
		expect(sharedSensorData.public).toBe(false);
		expect(sharedSensorData.sharedTo).toBe(secondaryEmail);
	});

	itif(RI)('`share` is successful and shows original name', async () => {
		const sharedWithNameGatewayMac = randomMac();
		const sharedWithNameMac = randomMac();
		const sharedWithNameName = "TEST-WITH-NAME";

        const createResult = await createSensorWithData(sharedWithNameMac, sharedWithNameGatewayMac, null, sharedWithNameName);
        expect(createResult).toBe(true);

		await sleep(500);

		let shareResult = null;
		try {
			shareResult = await post('share', {
				sensor: sharedWithNameMac,
				user: secondaryEmail
			});
		} catch (e) {
			console.log('share failed', e.response.data);
		}
        expect(shareResult).not.toBeNull();
		expect(shareResult.status).toBe(200, 'share result: ' + shareResult.status);
		
		// Verify share being found
		let sharedSensorData = null;
		try {
			sharedSensorData = await get('get', { sensor: sharedWithNameMac }, secondaryHttp);
		} catch (e) {
			console.log('get failed', e);
			expect(false).toBe(true);
		}
        expect(sharedSensorData).not.toBeNull();
		expect(sharedSensorData.data.data.sensor).toBe(sharedWithNameMac);
		expect(sharedSensorData.data.data.name).toBe(sharedWithNameName);

		await post('unclaim', {
			sensor: sharedWithNameMac
		});
	});

	itif(RI)('`share` is successful and shows name set by sharee', async () => {
		const sharedWithNameGatewayMac = randomMac();
		const sharedWithNameMac = randomMac();
		const sharedWithNameName = "TEST-WITH-NAME";
		const sharedWithNameShareeName = "SHAREE-WITH-NAME";

        const createResult = await createSensorWithData(sharedWithNameMac, sharedWithNameGatewayMac, null, sharedWithNameName);
        expect(createResult).toBe(true);

		let shareResult = null;
		try {
			shareResult = await post('share', {
				sensor: sharedWithNameMac,
				user: secondaryEmail
			});
		} catch (e) {
			console.log('share failed', e.response.data);
			expect(false).toBe(true);
		}
        expect(shareResult).not.toBeNull();
		expect(shareResult.status).toBe(200, 'share result: ' + shareResult.status);
		
        // Update the sharee's sensor name 
		try {
			await post('update', {
				sensor: sharedWithNameMac,
				name: sharedWithNameShareeName,
			}, secondaryHttp);
		} catch (e) {
			console.log('Update failed', e.response.data);
			expect(false).toBe(true);
		}

		// Verify share being found
		let thrown = false;
		let sharedSensorData = null;
		try {
			sharedSensorData = await get('get', { sensor: sharedWithNameMac }, secondaryHttp);
		} catch (e) {
			console.log('error thrown when getting', e.response.data);
			thrown = true;
		}
		expect(thrown).toBe(false);
		expect(sharedSensorData.data.data.sensor).toBe(sharedWithNameMac);
		expect(sharedSensorData.data.data.name).toBe(sharedWithNameShareeName);

        const userData = await get('user', {}, secondaryHttp);
        expect(userData.data.data.email).toBe(secondaryEmail);
        const sharedSensor = userData.data.data.sensors.find(s => s.sensor === sharedWithNameMac);

        try {
            await post('unclaim', {
                sensor: sharedWithNameMac
            });
        } catch (e) {
            console.error('Failed to unclaim sensor', e.response.data);
        }

        expect(sharedSensor.name).toBe(sharedWithNameShareeName);
	});

	itif(RI)('`sensors` returns the proper response with shared and unshared sensors', async () => {
		let sensorData = null;
        try {
            sensorData = await get('sensors');
        } catch (e) {
            console.error('failed to get sensor data', e.response.data);
        }

        expect(sensorData).not.toBeNull();
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
        const newSensor = userShareData.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor).not.toBeDefined();
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
        const newSensor = userShareData.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor).not.toBeDefined();
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


