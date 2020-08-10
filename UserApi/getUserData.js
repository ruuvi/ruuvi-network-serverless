const gatewayHelper = require('Helpers/gatewayHelper.js');

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
    let sanitizedEmail = 'abc@abc.com';
    let results = await mysql.query(
        `SELECT
            id,
            email
        FROM users
        WHERE email = '${sanitizedEmail}';`
    );
  
    // Run clean up function
    await mysql.end();
  
    // Return the results
    return gatewayHelper.successResponse(results);
}