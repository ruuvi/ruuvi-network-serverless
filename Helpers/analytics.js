const redis = require('../Helpers/redisHelper').getClient();
const validator = require('../Helpers/validator');

/**
 * Records first and last update for a key.
 * 
 * @param {string} key Key to store metric by
 */
const recordLastUpdate = async (key) => {
    const fullKey = "analytics_" + key;

    const now = validator.now();
    const analyticsVar = await redis.get(fullKey);
    
    let data = null;
    if (analyticsVar === null) {
        // TODO: Attempt to fetch from Dynamo
        data = {
            FirstUpdate: now,
            LastUpdate: now,
            LastPermanent: now
        };
    } else {
        data = JSON.parse(analyticsVar);
        data.LastUpdate = now;

        if (parseInt(data.LastPermanent) < now - 60) {
            // TODO: Store to Dynamo
        }
    }

    await redis.set(fullKey, JSON.stringify(data));
}

/**
 * Fetches the metrics update from Redis (or Dynamo if not found). Returns null if no entry is found.
 * 
 * @param {string} key Key to get metric by
 * @returns object or null
 */
const getLastUpdate = async (key) => {
    const fullKey = "analytics_" + key;

    const analyticsVar = await redis.get(fullKey);
    if (analyticsVar !== null) {
        return JSON.parse(analyticsVar);
    }
    
    return null;
}

/**
 * Exports
 */
module.exports = {
    recordLastUpdate,
    getLastUpdate
};
