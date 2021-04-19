const asyncRedis = require("async-redis");


exports.handler = async (event) => {
    const redisOptions = {
        host: process.env.REDIS_HOST,
        port: 6379
    }
    const client = asyncRedis.createClient(redisOptions);

    let value = "empty";
    try {
        await client.set("string key", "string val");
        value = await client.get("string key");
        console.log(value);
        await client.flushall("string key");
    } catch (e) {
        console.log(e);
    } finally {
        console.log(value);
    }
    
    return value;
};
