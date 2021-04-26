const asyncRedis = require("async-redis");

/**
 * Fetches a key from redis
 * 
 * @param string key
 */
 const getClient = () => {
    const redisOptions = {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
    return client = asyncRedis.createClient(redisOptions);
}

/**
 * Exports
 */
module.exports = {
    getClient
};
