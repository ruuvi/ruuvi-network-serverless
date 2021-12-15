const asyncRedis = require('async-redis');

let client = null;

/**
 * Fetches a key from redis
 *
 * @param string key
 */
const getClient = () => {
  if (client !== null) {
    return client;
  }
  try {
    const redisOptions = {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    };
    client = asyncRedis.createClient(redisOptions);
  } catch (e) {
    console.error('Failed to connect to Redis:', e);
    return null;
  }

  return client;
};

/**
 * Exports
 */
module.exports = {
  getClient
};
