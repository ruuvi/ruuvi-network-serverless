const redis = require('../Helpers/redisHelper').getClient();
const sqlHelper = require('../Helpers/sqlHelper');
const emailHelper = require('../Helpers/emailHelper');

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
        console.log('cached data', data);
    } else {
        console.log(data);
    }
    
    let active = [];
    data.forEach((alert) => {
        console.log(alert);
        if (!alert.triggered) {
            active.push(alert);
        }
    });
    console.log('refreshed active cache', active);
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
        refreshAlertCache(sensor, raw);
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
            enabled: alert.enabled ? true : false,
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
const putAlert = async (userId, sensor, type, min, max, enabled) => {
    let res = true;
    try {
        const putResult = await sqlHelper.saveAlert(userId, sensor, type, enabled, min, max);
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
const triggerAlert = async (alertData, sensorData, triggerType) => {
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var updateResult = await sqlHelper.updateValues('sensor_alerts', ['triggered = ?', 'triggered_at = ?'], [1, nowDate], ['sensor_id = ?', 'user_id = ?', 'triggered = ?'], [alertData.sensorId, alertData.userId, 0]);
    
    if (updateResult === 1) {
        console.log('Sending Alert Email to user: ' + alertData.userId);
        const userHelper = require('../Helpers/userHelper');

        const user = userHelper.getById(alertData.userId);
        console.log(alertData);
        console.log(sensorData);
        await emailHelper.sendAlertEmail(
            user.email,
            sensorData.sensor_id, // TODO: Fetch profile
            sensorData.sensor_id,
            alertData.type,
            triggerType,
            sensorData[alertData.type],
            triggerType == 'over' ? alertData.max : alertData.min
        );
    }
}

/**
 * Processes the alerts for a sensor
 * 
 * @param {array} alerts Array of alerts
 * @param {string} data 
 */
const processAlerts = async (alerts, sensorData) => {
    alerts.forEach(async (alert) => {
        if (sensorData[alert.type] > alert.max) {
            await triggerAlert(alert, sensorData, 'over');
        }
        if (sensorData[alert.type] < alert.min) {
            await triggerAlert(alert, sensorData, sensorData[alert.type], 'under');
        }
    });
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
