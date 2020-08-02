const guidHelper = require('helpers/guidHelper');
const gatewayHelper = require('helpers/gatewayHelper.js');

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.ENDPOINT,
        database : process.env.DATABASE,
        user     : process.env.USERNAME,
        password : process.env.PASSWORD
    }
});
  
// Main handler function
exports.handler = async (event, context) => {
    const eventBody = JSON.parse(event.body);
    
    if (
        !eventBody.hasOwnProperty('email')
    ) {
        return gatewayHelper.response(400);
    }

    const email = eventBody.email;
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegexp.test(email)) {
        return gatewayHelper.response(400, null, '{"result":"error","message":"Invalid e-mail address."}');
    }
    
    // Run your query
    let results = null;
    
    try {
        results = await mysql.query(
            "INSERT INTO users (email) VALUES ('" + email + "')"
        );
      
        // Run clean up function
        await mysql.end();
    } catch (e) {
        // TODO: Better error handling - possibly better done async
        console.error("Unable to insert user: " + email);
        console.error(e);
        
        return gatewayHelper.response(500);
    }  
    const userInfo = {
        accessToken: guidHelper.guid(32),
        data: results
    };
    console.log(results);

    // Return the results
    return gatewayHelper.response(200, null, JSON.stringify(userInfo));
}