const gatewayHelper = require('helpers/gatewayHelper.js');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.ENDPOINT,
        database : process.env.DATABASE,
        user     : process.env.USERNAME,
        password : process.env.PASSWORD
    }
})

// Main handler function
exports.handler = async (event, context) => {
    // Run your query
    let results = await mysql.query(
        'SELECT * FROM users'
    );
  
    // Run clean up function
    await mysql.end();
  
    // Return the results
    return results;
}