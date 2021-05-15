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
    return JSON.parse(alerts);
}

/**
 * Refreshes the redis cache for an individual sensor.
 * 
 * @param {string} sensor Sensor ID
 */
const refreshAlertCache = async (sensor, data = null) => {
    if (data === null) {
        data = await getAlerts(sensor);
    }
    
    await redis.set("alerts_" + sensor, JSON.stringify(data));
}

/**
 * Fetches alerts for individual sensor
 * 
 * @param {string} sensor Sensor ID
 * @param {userId} mixed int or null, if null, will fetch for all users
 * @param {useCache} bool If true, will only access cache 
 */
const getAlerts = async (sensor, userId = null, useCache = false) => {
    if (useCache) {
        return await getCachedAlerts(sensor);
    }

    let raw = await sqlHelper.fetchAlerts(sensor, userId);
    
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

    // Cache holds all alerts for a sensor; only refresh when all alerts are fetched from database
    if (userId === null) {
        refreshAlertCache(sensor, raw);
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
const putAlert = async (userId, sensor, type, min, max, enabled) => {
    let res = true;
    try {
        putResult = await sqlHelper.saveAlert(userId, sensor, type, enabled, min, max);
    } catch (e) {
        console.error(e);
        res = false;
    }

    // Put the alerts JSON to cache for faster look up
    refreshAlertCache(sensor);

    return res;
}

/**
 * Processes the alerts for a sensor
 * 
 * @param {array} alerts Array of alerts
 * @param {string} data 
 */
const processAlerts = async (alerts, sensorData) => {
    ['temperature', 'humidity', 'pressure'].forEach((alertType) => {
        alerts.forEach(async (alert) => {
            if (alert.type === alertType) {
                if (
                    data[alertType] > alert.MaxValue
                    || data[alertType] < alert.MinValue
                ) {
                    console.log('Alert condition hit');
                    await emailHelper.sendAlertEmail(email, 'kek', alertType);
                }
            }
        });
    });
}

/**
 * Exports
 */
module.exports = {
    getAlerts,
    refreshAlertCache,
    putAlert,
    processAlerts
};
