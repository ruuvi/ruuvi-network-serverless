const redis = require("redis");

/**
 * Fetches a key from redis
 * 
 * @param string key
 */
 const fetch = async (key) => {
    const redisOptions = {
        host: process.env.REDIS_HOST,
        port: 6379
    }
    
    let client = redis.createClient(redisOptions);
    
    client.set('colors',JSON.stringify({red: 'rojo'}))
    const value = await client.get('colors')

    return value;
}


/**
 * Exports
 */
module.exports = {
    fetch
};
