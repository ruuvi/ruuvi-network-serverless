const guidHelper = require('Helpers/guidHelper');
const gatewayHelper = require('Helpers/gatewayHelper.js');
const emailHelper = require('Helpers/emailHelper');
const validator = require('Helpers/validator');
const ses = new aws.SES({region: 'eu-central-1'});

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
    
    const valid = validator.hasKeys(eventBody, ['email']) && validator.validateEmail(eventBody.email);

    if (!valid) {
        return gatewayHelper.invalid();
    }
    
    let results = null;

    const userInfo = {
        email: email,
        verificationToken: guidHelper.guid(32)
    };

    try {
        results = await mysql.query(
            `INSERT INTO user_registrations (
                email,
                token
            ) VALUES (
                '${userInfo.email}',
                '${userInfo.verificationToken}'
            );`
        );

        if (results.insertId) {
            const emailResult = emailHelper.sendEmailVerification(userInfo.email, userInfo.verificationToken, ses);
            console.log(emailResult); // TODO: Remove or format
            if (emailResult.err !== null) {
                throw new Error("Error sending e-mail: " + emailResult.err);
            }
        }

        await mysql.end();
    } catch (e) {
        // Conflict
        if (e.code === 'ER_DUP_ENTRY') {
            return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.CONFLICT, "E-mail already exists.");
        }
        console.log("Error creating registration request: " + e.error);
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INTERNAL, "Unknown error occurred.");
    }

    return gatewayHelper.successResponse();
}