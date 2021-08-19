/**
 * Alerts test suite for the back-end.
 */
 const {
	utils,

	itif,
    get,
    post,

	RI,
    PRODUCTION,
    
	secondaryHttp,
    primaryEmail,
    secondaryEmail,
    unregisteredEmail,
    sleep
} = require('./common');

const newSensorMac = utils.randomMac();
const newGatewayMac = utils.randomMac();

const triggerAlertTestCases = [
    // Has humidity of 36.325
    {
        sensorName: 'Humidity Sensor (not triggered)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'humidity',
        min: 30,
        max: 100,
        enabled: true,
        description: 'Humidity test',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: false
    },
    {
        sensorName: 'Humidity Sensor with Offset (max)',
        offsetHumidity: 30,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'humidity',
        min: 25,
        max: 50,
        enabled: true,
        description: 'Humidity max test with offset',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },
    {
        sensorName: 'Humidity Sensor with Offset (min)',
        offsetHumidity: 30,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'humidity',
        min: 67,
        max: 120,
        enabled: true,
        description: 'Humidity min test with offset',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },

    // Has temperature of 21.45 degrees
    {
        sensorName: 'Temperature Sensor (not triggered)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'temperature',
        min: 21,
        max: 22,
        enabled: true,
        description: 'Temperature test',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: false
    },
    {
        sensorName: 'Temperature Sensor with Offset (max)',
        offsetHumidity: 0,
        offsetTemperature: 30,
        offsetPressure: 0,
        signal: -76,

        type: 'temperature',
        min: 0,
        max: 50,
        enabled: true,
        description: 'Temperature max test with offset',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },
    {
        sensorName: 'Temperature Sensor with Offset (min)',
        offsetHumidity: 0,
        offsetTemperature: 30,
        offsetPressure: 0,
        signal: -76,

        type: 'temperature',
        min: 52,
        max: 120,
        enabled: true,
        description: 'Temperature min test with offset',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },

    // Has pressure of 98606
    {
        sensorName: 'Pressure Sensor (not triggered)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'pressure',
        min: 98605,
        max: 98607,
        enabled: true,
        description: 'Pressure test',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: false
    },
    {
        sensorName: 'Pressure Sensor without Offset (max)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'pressure',
        min: 0,
        max: 98605,
        enabled: true,
        description: 'Pressure max test without offset',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },
    {
        sensorName: 'Pressure Sensor with Offset (max)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 30,
        signal: -76,

        type: 'pressure',
        min: 0,
        max: 98607,
        enabled: true,
        description: 'Pressure max test with offset',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },
    {
        sensorName: 'Pressure Sensor with Offset (min)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: -30,
        signal: -76,

        type: 'pressure',
        min: 98605,
        max: 1000000,
        enabled: true,
        description: 'Pressure min test with offset',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },

    // Signal
    {
        sensorName: 'Signal Sensor (not triggered)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'signal',
        min: -77,
        max: -75,
        enabled: true,
        description: 'Signal test',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: false
    },
    {
        sensorName: 'Signal Sensor (max)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'signal',
        min: -75,
        max: 0,
        enabled: true,
        description: 'Signal max test',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },
    {
        sensorName: 'Signal Sensor (min)',
        offsetHumidity: 0,
        offsetTemperature: 0,
        offsetPressure: 0,
        signal: -76,

        type: 'signal',
        min: -78,
        max: -77,
        enabled: true,
        description: 'Signal min test',
        data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',

        triggered: true
    },
];

describe('Alerts integration test suite', () => {
    /**
     * TODO: These should be created inside tests or pre-step
     */
    itif(RI)('Initial setup for legacy alert tests', async() => {
        let thrown = false;
		try {
			await post('claim', {
				sensor: newSensorMac,
				name: 'TemperatureTestSensor'
			});
        } catch (e) {
            thrown = true;
        }
        expect(thrown).toBe(false);
    });

	itif(RI)('creating an alert is successful', async () => {
		const testAlertDescription = 'Hoblaa, nice alert!';
		const createResult = await post('alerts', {
			sensor: newSensorMac,
			type: 'humidity',
			min: 30,
			max: 100,
			enabled: true,
			description: testAlertDescription
		});
		expect(createResult.status).toBe(200, 'Create');

		// Validate existence
		const readResult = await get('alerts', {
			sensor: newSensorMac
		});
		expect(readResult.status).toBe(200, 'Read');
		const newSensor = readResult.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor.alerts.length).toBe(1);

		expect(newSensor.alerts[0].description).toBe(testAlertDescription);
		expect(newSensor.alerts[0].max).toBe(100);
		expect(newSensor.alerts[0].min).toBe(30);
		expect(newSensor.alerts[0].triggered).toBe(false);
		expect(newSensor.alerts[0].enabled).toBe(true);
		expect(newSensor.alerts[0].type).toBe('humidity');
		expect(newSensor.alerts[0].offsetHumidity).not.toBeDefined();
		expect(newSensor.alerts[0].offsetPressure).not.toBeDefined();
		expect(newSensor.alerts[0].offsetTemperature).not.toBeDefined();
	});

	itif(RI)('cannot create an alert for a sensor with no access rights', async () => {
		try {
			await post('alerts', {
				sensor: newSensorMac,
				type: 'humidity',
				min: 30,
				max: 100,
				enabled: true
			}, secondaryHttp);
		} catch (e) {
			expect(e.message).toMatch(/Request failed with status code 403/);
			threw = true;
		}

		expect(threw).toBe(true);
	});

	itif(RI)('getting alerts without filter is successful', async () => {
		const readResult = await get('alerts');

		expect(readResult.status).toBe(200, 'Read');
		const newSensor = readResult.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor).not.toBeNull();
		expect(newSensor.alerts.length).toBe(1);

		// Additional validation that at least one is new sensor mac
		expect(newSensor.alerts[0].max).toBe(100);
		expect(newSensor.alerts[0].min).toBe(30);
		expect(newSensor.alerts[0].triggered).toBe(false);
		expect(newSensor.alerts[0].enabled).toBe(true);
		expect(newSensor.alerts[0].type).toBe('humidity');
	});

	itif(RI)('Updating an alert is successful', async () => {
		const updatedAlertDescription = 'Hola!';
		const updateResult = await post('alerts', {
			sensor: newSensorMac,
			type: 'humidity',
			min: 20,
			max: 50,
			enabled: false,
			description: updatedAlertDescription
		});
		expect(updateResult.status).toBe(200, 'Update');

		// Validate existence
		const readResult = await get('alerts', {
			sensor: newSensorMac
		});
		expect(readResult.status).toBe(200, 'Read');
		const newSensor = readResult.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor.alerts.length).toBe(1);

		expect(newSensor.alerts[0].description).toBe(updatedAlertDescription);
		expect(newSensor.alerts[0].max).toBe(50);
		expect(newSensor.alerts[0].min).toBe(20);
		expect(newSensor.alerts[0].enabled).toBe(false);
	});

    for (let testCase of triggerAlertTestCases) {
        itif(RI)(`triggering a ${testCase.type} limit alert on ${testCase.sensorName} is successful`, async () => {
            // Setup
            const alertSensorMac = utils.randomMac();
            const alertGatewayMac = utils.randomMac();

            try {
                await post('claim', {
                    sensor: alertSensorMac,
                    name: testCase.sensorName
                });

                await post('update', {
                    sensor: alertSensorMac,
                    offsetHumidity: testCase.offsetHumidity,
                    offsetPressure: testCase.offsetPressure,
                    offsetTemperature: testCase.offsetTemperature
                });

                await post('alerts', {
                    sensor: alertSensorMac,
                    type: testCase.type,
                    min: testCase.min,
                    max: testCase.max,
                    enabled: testCase.enabled,
                    description: testCase.description
                });
            } catch (e) {
                console.log(e);
                expect(true).toBe(false, 'Failed to create alert');
            }

            // Create request
            let tags = {};
            tags[alertSensorMac] = {
                "rssi":	testCase.signal,
                "timestamp":	Date.now() - 50,
                "data": testCase.data
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
            const alertSensor = readResult.data.data.sensors.find(s => s.sensor === alertSensorMac);
            expect(alertSensor.alerts.length).toBe(1);

            expect(alertSensor.alerts[0].type).toBe(testCase.type);
            expect(alertSensor.alerts[0].min).toBe(testCase.min);
            expect(alertSensor.alerts[0].max).toBe(testCase.max);
            expect(alertSensor.alerts[0].enabled).toBe(testCase.enabled);
            expect(alertSensor.alerts[0].description).toBe(testCase.description);
            expect(alertSensor.alerts[0].description).toBe(testCase.description);
            expect(alertSensor.alerts[0].triggered).toBe(testCase.triggered);
            expect(alertSensor.alerts[0].triggeredAt).toMatch(/^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9])(?:(T [0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?/);

            try {
                await post('unclaim', {
                    sensor: alertSensorMac
                });
            } catch (e) {
                console.log(e);
            }
        });
    }

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
        const alertSensor = readResult.data.data.sensors.find(s => s.sensor === alertSensorMac);
        expect(alertSensor.alerts.length).toBe(1);
        expect(alertSensor.alerts[0].triggered).toBe(true);
        expect(alertSensor.alerts[0].triggeredAt).toMatch(/^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9])(?:(T [0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?/);

        try {
            await post('unclaim', {
                sensor: alertSensorMac
            });
        } catch (e) {
            console.log(e);
        }
    });

	itif(RI)('triggering a movement alert on a sensor is successful', async () => {
		// Setup
		const alertSensorMac = utils.randomMac();
		const alertGatewayMac = utils.randomMac();

		try {
			await post('claim', {
				sensor: alertSensorMac
			});

			await post('update', {
				sensor: alertSensorMac,
				name: 'sensor for movement'
			});

			// Alert range between 25-50, test point 36.325
			await post('alerts', {
				sensor: alertSensorMac,
				type: 'movement',
				counter: 183,
				enabled: true
			});
		} catch (e) {
			expect(true).toBe(false, 'Failed to create movement alert');
		}

		// Create request
		let tags = {};
		tags[alertSensorMac] = {
			"rssi":	-76,
			"timestamp":	Date.now() - 50,
			// Has movements of 184
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
		let readResult = await get('alerts', {
			sensor: alertSensorMac
		});

		expect(readResult.status).toBe(200, 'Read');
		const alertSensor = readResult.data.data.sensors.find(s => s.sensor === alertSensorMac);
		expect(alertSensor.alerts.length).toBe(1);
		expect(alertSensor.alerts[0].triggered).toBe(true);
		expect(alertSensor.alerts[0].triggeredAt).toMatch(/^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9])(?:(T [0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?/);

        const triggeredFirst = alertSensor.alerts[0].triggeredAt;

        // MOVEMENT CAN BE RETRIGGERED // Test that
        if (PRODUCTION) return;

        tags[alertSensorMac].data = '0201061BFF99040511D74955CDDEFFE800000408B776B93020EF544AE71D9E';

        // Well this officially shucks. :D
        await sleep(60000);

        tags[alertSensorMac].timestamp = Date.now();
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

        await sleep(1000);

		readResult = await get('alerts', {
			sensor: alertSensorMac
		});

        const alertSensorRefreshed = readResult.data.data.sensors.find(s => s.sensor === alertSensorMac);
		expect(alertSensorRefreshed.alerts.length).toBe(1);
		expect(alertSensorRefreshed.alerts[0].triggered).toBe(true);
		expect(alertSensorRefreshed.alerts[0].triggeredAt).toMatch(/^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9])(?:(T [0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?/);
        expect(alertSensorRefreshed.alerts[0].triggeredAt).not.toBe(triggeredFirst);

        // CLEAN UP
        try {
            await post('unclaim', {
                sensor: alertSensorMac
            });
        } catch (e) {
            console.log(e);
        }
	});

	itif(RI)('does not return alerts for another user', async () => {
		const readResult = await get('alerts');

		expect(readResult.status).toBe(200, 'Read');
		const newSensor = readResult.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensor).not.toBeNull();
		expect(newSensor.alerts.length).toBe(1);


		const readResultSecondary = await get('alerts', null, secondaryHttp);
		expect(readResultSecondary.status).toBe(200, 'Read');
		const newSensorSecondary = readResultSecondary.data.data.sensors.find(s => s.sensor === newSensorMac);
		expect(newSensorSecondary).not.toBeDefined();
	});

	itif(RI)('cannot request alerts for non-owned sensor', async () => {
			// Validate existence
		try {
			await get('alerts', {
				sensor: newSensorMac
			}, secondaryHttp);
		} catch (e) {
			expect(e.message).toMatch(/Request failed with status code 403/);
			threw = true;
		}

		expect(threw).toBe(true);
	});

    /**
     * TODO: These should be done in test or post-step
     */
    itif(RI)('Clean up legacy alert setup', async () => {
		const claimResult = await post('unclaim', {
			sensor: newSensorMac
		});
		expect(claimResult.status).toBe(200);
		expect(claimResult.statusText).toBe('OK');
	});
});


