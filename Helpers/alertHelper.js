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
        if (!alert.triggered) {
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
    raw.forEach((alert) => {
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
            offsetPressure: alert.offset_temperature,
            description: alert.description,
            triggered: alert.triggered ? true : false,
            triggeredAt: alert.triggered_at
        });
    });
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
 * Will set the alert triggered and proceed with any alerting actions such
 * as sending e-mails.
 * 
 * @param {object} alertData Array data of the alert to be triggered
 * @param {object} sensorData Sensor info
 * @param {string} triggerType over / under
 */
const triggerAlert = async (alertData, sensorData, triggerType, overrideEnabled = false) => {
    if (!overrideEnabled && !alertData.enabled) {
        return;
    }

    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var updateResult = await sqlHelper.updateValues('sensor_alerts', ['triggered = ?', 'triggered_at = ?'], [1, nowDate], ['sensor_id = ?', 'user_id = ?', 'alert_type = ?'], [alertData.sensorId, alertData.userId, alertData.type]);
    if (updateResult === 1) {
        console.log('Sending Alert Email to user: ' + alertData.userId);
        const userHelper = require('../Helpers/userHelper');
        const user = await userHelper.getById(alertData.userId);
        const sensorProfile = await sqlHelper.fetchSensorsForUser(alertData.userId, sensorData.sensor_id);

        let name = sensorData.sensor_id;
        if (sensorProfile.length > 0 && sensorProfile[0].name !== '') {
            name = sensorProfile[0].name;
        }

        let previousValue = '';
        if (triggerType === 'under') {
            previousValue = alertData.min;
        } else if (triggerType === 'over') {
            previousValue = alertData.max;
        } else {
            previousValue = alertData.counter;
        }

        try {
            await emailHelper.sendAlertEmail(
                user.email,
                name,
                sensorData.sensor_id,
                alertData.type,
                triggerType,
                sensorData[alertData.type],
                previousValue,
                alertData.description
            );
        } catch (e) {
            console.error(e);
        }
    } else {
        await refreshAlertCache(sensorData.sensor_id);
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
    for (const alert of alerts) {
        if (!alert.enabled) {
            continue;
        }

        // Throttling
        const throttleAlert = await throttleHelper.throttle(
            `alert:${alert.userId}:${sensorData.sensor_id}:${alert.type}`,
            throttleHelper.defaultIntervals.alert
        );
        if (throttleAlert) {
            continue;
        }

        // Trigger
        if (alert.type !== 'movement') {
            const offsetKey = 'offset' + capitalize(alert.type);
            if (sensorData[alert.type] > alert.max + alert[offsetKey]) {
                await triggerAlert(alert, sensorData, 'over');
            }
            if (sensorData[alert.type] < alert.min + alert[offsetKey]) {
                await triggerAlert(alert, sensorData, 'under');
            }
        } else {
            if (
                alert.type === 'movement'
                && parseInt(sensorData['movementCounter']) !== parseInt(alert.counter)
            ) {
                await triggerAlert(alert, sensorData, 'different from');
            }
        }
    };
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
