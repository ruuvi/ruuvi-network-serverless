const redis = require('../Helpers/redisHelper').getClient();
const validator = require('../Helpers/validator');

const defaultIntervals = {
    alert: 3600
}

const clearThrottle = async (throttleKey, interval) => {
    const fullThrottleKey = "throttle_" + interval + "_" + throttleKey;
    await redis.del(fullThrottleKey);
    return true;
}

/**
 * If throttled, returns true. Otherwise, refreshes latest value and returns false.
 * 
 * @param {string} throttleKey Key to throttle by
 * @param {integer} interval interval in seconds
 * @returns true if throttled
 */
 const throttle = async (throttleKey, interval) => {
    // No throttling without interval
    if (interval === 0) {
        return false;
    }

    const fullThrottleKey = "throttle_" + interval + "_" + throttleKey;

    const now = validator.now();
    const throttleVar = await redis.get(fullThrottleKey);
    const itemTimestamp = throttleVar === null ? 0 : parseInt(throttleVar);

    const diff = now - itemTimestamp;
    if (itemTimestamp > 0 && diff < interval) {
        const roundedDiff = Math.round((diff + Number.EPSILON) * 100) / 100;
        console.info(`${fullThrottleKey} at ${now} (${roundedDiff}:${interval}:${itemTimestamp})`);
        return true;
    }

    await redis.set(fullThrottleKey, now);
    return false;
}

/**
 * Exports
 */
module.exports = {
    throttle,
    clearThrottle,

    defaultIntervals
};
