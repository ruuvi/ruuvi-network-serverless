const redis = require('../Helpers/redisHelper').getClient();
const dynamoHelper = require('../Helpers/dynamoHelper');

/**
 * Fetches alerts for individual sensor
 */
 const getCachedAlerts = async (sensor) => {
    return await redis.get("alerts_" + sensor);
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
 */
const getAlerts = async (sensor, useCache = false) => {
    if (useCache) {
        return await getCachedAlerts(sensor);
    }

    let raw = await dynamoHelper.fetchAlerts(sensor);
    
    let formatted = [];
    raw.forEach((alert) => {
        formatted.push({
            'type': alert.AlertType,
            'min': alert.MinValue,
            'max': alert.MaxValue,
            'enabled': alert.Enabled
        });
    });

    refreshAlertCache(sensor, formatted);

    return formatted;
}

/**
 * Stores an alert
 * 
 * @param {*} sensor 
 * @param {*} type 
 * @param {*} min 
 * @param {*} max 
 * @param {*} enabled 
 * @returns 
 */
const putAlert = async (sensor, type, min, max, enabled) => {
    // Store to Dynamo
    let res = true;
    try {
        putResult = await dynamoHelper.saveAlert(sensor, type, enabled, min, max);
    } catch (e) {
        console.error(e);
        res = false;
    }

    // Put the alerts JSON to Redis cache for faster look up
    refreshAlertCache(sensor);

    return res;
}

/**
 * Exports
 */
module.exports = {
    getAlerts,
    refreshAlertCache,
    putAlert
};
