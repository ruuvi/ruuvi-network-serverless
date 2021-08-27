const redis = require('../Helpers/redisHelper').getClient();
const sqlHelper = require('../Helpers/sqlHelper');
const emailHelper = require('../Helpers/emailHelper');
const throttleHelper = require('../Helpers/throttleHelper');

/**
 * Fetches alerts for individual sensor
 */
 const getCachedAlerts = async (sensor) => {
    const alerts = await redis.get("alerts_" + sensor);
    if (alerts === null) {
        return [];
    }
    const parsed = JSON.parse(alerts);
    const formatted = formatAlerts(parsed);
    return formatted;
}

/**
 * Refreshes the redis cache for an individual sensor.
 * 
 * @param {string} sensor Sensor ID
 */
const refreshAlertCache = async (sensor, data = null) => {
    if (data === null) {
        data = await getAlerts(sensor, null, false, true);
    }
    
    let active = [];
    data.forEach((alert) => {
        if (alert.enabled) {
            active.push(alert);
        }
    });

    await redis.set("alerts_" + sensor, JSON.stringify(active));
}

/**
 * Fetches alerts for individual sensor
 * 
 * @param {string} sensor Sensor ID
 * @param {userId} mixed int or null, if null, will fetch for all users
 * @param {useCache} bool If true, will only access cache 
 */
const getAlerts = async (sensor, userId = null, useCache = false, returnRaw = false) => {
    if (useCache) {
        const cachedAlerts = await getCachedAlerts(sensor);
        return cachedAlerts;
    }

    let raw = await sqlHelper.fetchAlerts(sensor, userId);
    if (raw === null) {
        return [];
    }

    // Cache holds all alerts for a sensor; only refresh when all alerts are fetched from database
    if (userId === null) {
        await refreshAlertCache(sensor, raw);
    }


    return returnRaw ? raw : formatAlerts(raw);
}

/**
 * Formats the alerts to the outputtable format.
 * 
 * @param {array} raw Raw alerts from database
 */
const formatAlerts = (raw) => {
    let formatted = [];
    for (const alert of raw) {
        formatted.push({
            userId: alert.user_id,
            sensorId: alert.sensor_id,
            type: alert.alert_type,
            min: alert.min_value,
            max: alert.max_value,
            counter: alert.counter,
            enabled: alert.enabled ? true : false,
            offsetHumidity: alert.offset_humidity,
            offsetTemperature: alert.offset_temperature,
            offsetPressure: alert.offset_pressure,
            description: alert.description,
            triggered: alert.triggered ? true : false,
            triggeredAt: alert.triggered_at
        });
    }
    return formatted;
}

/**
 * Stores an alert
 * 
 * @param {*} userId
 * @param {*} sensor 
 * @param {*} type 
 * @param {*} min 
 * @param {*} max 
 * @param {*} enabled 
 * @returns 
 */
const putAlert = async (userId, sensor, type, min = Number.MIN_VALUE, max = Number.MAX_VALUE, counter = 0, enabled = true, description = '') => {
    let res = true;
    try {
        const putResult = await sqlHelper.saveAlert(userId, sensor, type, enabled, min, max, counter, description);
    } catch (e) {
        console.error(e);
        res = false;
    }

    // Put the alerts JSON to cache for faster look up
    await refreshAlertCache(sensor);

    return res;
}

/**
 * Gets the unit alert per type.
 * 
 * @param {*} alertType 
 * @returns 
 */
const getUnit = async (alertType, userId) => {
    switch (alertType) {
        case 'movement':
            return ' movements';
        case ' humidity':
            return '%';
        case 'signal':
            return ' RSSI';
        case 'pressure':
            return ' hPa';
        case 'temperature':
            const userSetting = await sqlHelper.fetchUserSetting(userId, 'UNIT_TEMPERATURE');
            if (userSetting === 'F') {
                return '°F';
            }
            return '°C';
        default:
            return null;
    }
}

/**
 * Will set the alert triggered and proceed with any alerting actions such
 * as sending e-mails.
 * 
 * @param {object} alertData Array data of the alert to be triggered
 * @param {object} sensorData Sensor info
 * @param {string} triggerType over / under
 */
const triggerAlert = async (alertData, sensorData, triggerType, overrideEnabled = false, sendEmail = true) => {
    if (!overrideEnabled && !alertData.enabled) {
        return;
    }

    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updateResult = await sqlHelper.updateValues('sensor_alerts', ['triggered = ?', 'triggered_at = ?'], [1, nowDate], ['sensor_id = ?', 'user_id = ?', 'alert_type = ?'], [alertData.sensorId, alertData.userId, alertData.type]);
    if (updateResult === 1) {
        console.log(`Updated ${alertData.type} Alert ('${triggerType}' for ${sensorData.sensor_id}) for user: ${alertData.userId}`);
        const userHelper = require('../Helpers/userHelper');
        const user = await userHelper.getById(alertData.userId);
        const sensorProfile = await sqlHelper.fetchSensorsForUser(alertData.userId, sensorData.sensor_id);

        let name = sensorData.sensor_id;
        if (sensorProfile.length > 0 && sensorProfile[0].name !== '') {
            name = sensorProfile[0].name;
        } else if (sensorProfile.length === 0) {
            console.error(`No sensor profile found for user ${alertData.userId} and sensor ${sensorData.sensor_id}. Not sending alert and refreshing cache.`);
            await refreshAlertCache(sensorData.sensor_id);
            return;
        }

        let previousValue = '';
        if (triggerType === 'under') {
            previousValue = alertData.min;
        } else if (triggerType === 'over') {
            previousValue = alertData.max;
        } else {
            previousValue = alertData.counter;
            await sqlHelper.updateValues(
                'sensor_alerts',
                [
                    'counter = ?',
                    'triggered_at = ?'
                ], [
                    parseInt(sensorData['movementCounter']),
                    nowDate
                ], [
                    'sensor_id = ?',
                    'user_id = ?',
                    'alert_type = ?'
                ], [
                    alertData.sensorId,
                    alertData.userId,
                    'movement'
                ]
            );
        }

        if (sendEmail) {
            console.log(`Sending email for ${alertData.type} Alert (${triggerType} for ${sensorData.sensor_id}) to user: ${alertData.userId}`);
            let currentValue = alertData.type === 'movement' ? sensorData.movementCounter : sensorData[alertData.type];
            let thresholdValue = previousValue;
            if (alertData.type === 'pressure') {
                currentValue = parseInt(currentValue) / 100;
                thresholdValue = parseInt(thresholdValue) / 100;
            }

            var alertUnit = await getUnit(alertData.type, alertData.userId);
            if (alertUnit === null) {
                console.error(`Unable to resolve alert type for alert ${alertData.alert_id} of type ${alertData.type} for user ${alertData.userId}`);
                return;
            }

            try {
                await emailHelper.sendAlertEmail(
                    user.email,
                    name,
                    sensorData.sensor_id,
                    alertData.type,
                    triggerType,
                    currentValue,
                    thresholdValue,
                    alertUnit,
                    alertData.description
                );
            } catch (e) {
                console.error(e);
            }
        }
    }
    
    await refreshAlertCache(sensorData.sensor_id);
}

const clearAlert = async (alertData) => {
    try {
        await sqlHelper.updateValues('sensor_alerts', ['triggered = ?'], [0], ['sensor_id = ?', 'user_id = ?', 'alert_type = ?'], [alertData.sensorId, alertData.userId, alertData.type]);
        await refreshAlertCache(alertData.sensorId);
    } catch (e) {
        console.error('Error clearing alert', e);
    }
}

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Processes the alerts for a sensor
 * 
 * @param {array} alerts Array of alerts
 * @param {string} data 
 */
const processAlerts = async (alerts, sensorData) => {
    const throttleInterval = process.env.ALERT_THROTTLE_INTERVAL ? process.env.ALERT_THROTTLE_INTERVAL : throttleHelper.defaultIntervals.alert;

    for (const alert of alerts) {
        if (!alert.enabled) {
            continue;
        }

        let triggered = false;
        let mode = null;

        if (alert.type !== 'movement') {
            const offsetKey = 'offset' + capitalize(alert.type);
            const offset = alert.type !== 'signal' ? alert[offsetKey] : 0

            if (sensorData[alert.type] + offset > alert.max) {
                mode = 'over';
                triggered = true;
            }
            if (sensorData[alert.type] + offset < alert.min) {
                mode = 'under';
                triggered = true;
            }
        } else {
            if (parseInt(sensorData['movementCounter']) !== parseInt(alert.counter)) {
                mode = 'different from';
                triggered = true;
            }
        }

        if (triggered) {
            // Throttling
            const throttleAlert = await throttleHelper.throttle(
                `alert:${alert.userId}:${sensorData.sensor_id}:${alert.type}`,
                throttleInterval
            );
            if (throttleAlert) {
                // For movement, we want to update the counters but not send an email when throttled
                if (alert.type === 'movement') {
                    console.log(`Triggered movement while throttled for ${sensorData.sensor_id} with value ${sensorData.movementCounter} (in alert: ${alert.counter}). Skipping e-mail.`);
                    await triggerAlert(alert, sensorData, mode, false, false);
                }
                continue;
            }

            await triggerAlert(alert, sensorData, mode);
        } 
        
        // Trigger
        if (!triggered && alert.triggered) {
            await clearAlert(alert);
        }
    };
    await sqlHelper.disconnect();
}

/**
 * Exports
 */
module.exports = {
    getAlerts,
    refreshAlertCache,
    putAlert,
    triggerAlert,
    processAlerts
};
