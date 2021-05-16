var AWS = require('aws-sdk');
AWS.config.update({region: 'eu-central-1'});

var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

/**
 * Queues the email for the service.
 * 
 * @param {string} email target email
 * @param {string} title email title
 * @param {string} body email body
 * @returns 
 */
const sendEmail = async (email, title, body) => {
    if (!process.env.EMAIL_QUEUE) {
        console.error("EMAIL_QUEUE variable not set!");
        return null;
    }

    const params = {
        MessageAttributes: {
            "TargetEmail": {
                DataType: "String",
                StringValue: email
            },
            "Title": {
                DataType: "String",
                StringValue: title
            }
        },
        MessageBody: body,

        QueueUrl: process.env.EMAIL_QUEUE,
        DelaySeconds: 1
    };

    return sqs.sendMessage(params).promise();
};

const sendEmailVerification = async (email, token, sourceDomain = null) => {
    let domain = process.env.BASE_API_URL;
    if (sourceDomain) {
        domain = sourceDomain;
    }
    const link = `${domain}/verify?token=${token}`;

    // TODO: This would be nicer to maintain by SES templates
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>Confirm your Ruuvi account e-mail!</h1>
            <p>
                Please enter the code to your mobile application to complete the registration:
                <div style="width:200px;text-align:center;">
                    <h2 style="border:1px solid;padding:5px;">${token}</h2>
                </div>
            </p>
            <p>
            (...or follow <a href="${link}">this link</a>)
            </p>
        </body>
      </html>
    `;

    return await sendEmail(email, "Ruuvi Account E-mail Confirmation", htmlBody);
};

const sendEmailInvitation = async (email, fromEmail, sensorName, token, sourceDomain = null) => {
    let domain = process.env.BASE_API_URL;
    if (sourceDomain) {
        domain = sourceDomain;
    }
    const link = `${domain}/verify?token=${token}`;

    // TODO: This would be nicer to maintain by SES templates
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>User shared a Ruuvi sensor with you!</h1>
            <p>
                User ${fromEmail} shared access to a sensor (${sensorName}) with you. Complete registration to view the data.
            </p>
            <p>
                Please enter the code to your mobile application to complete the registration:
                <div style="width:200px;text-align:center;">
                    <h2 style="border:1px solid;padding:5px;">${token}</h2>
                </div>
            </p>
            <p>
            (...or follow <a href="${link}">this link</a>)
            </p>
        </body>
      </html>
    `;

    return await sendEmail(email, "Ruuvi sensor was shared with you. Create an account to view it!", htmlBody);
};

const sendResetEmail = async (email, token, sourceDomain) => {
    let domain = process.env.BASE_API_URL;
    if (sourceDomain) {
        domain = sourceDomain;
    }
    const link = `${domain}/verify?token=${token}`;

    // TODO: This would be nicer to maintain by SES templates
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>Reset your Ruuvi credentials!</h1>
            <p>
                Please enter the code to your mobile application to complete the reset:
                <div style="width:200px;text-align:center;">
                    <h2 style="border:1px solid;padding:5px;">${token}</h2>
                </div>
            </p>
            <p>
                (...or follow <a href="${link}">this link</a>)
            </p>
        </body>
      </html>
    `;

    return await sendEmail(email, "Ruuvi Account Reset Confirmation", htmlBody);
};

const sendAlertEmail = async (email, sensorName, sensor, alertType, overUnder, value, threshold) => {
    // TODO: This would be nicer to maintain by SES templates
    if (!sensorName) {
        sensorName = 'Unnamed sensor';
    }
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>Sensor '${sensorName}' triggered an alert for ${alertType}!</h1>
            <p>
                ${sensorName} (${sensor}) reported a value of ${value} for ${alertType} which is ${overUnder} the threshold of ${threshold}!
            </p>
        </body>
      </html>
    `;

    return await sendEmail(email, `Sensor '${sensorName}' triggered an alert for ${alertType}!`, htmlBody);
};

const sendShareNotification = async (email, sensorName, sharerName) => {
    let sensorNameString = '';
    if (sensorName) {
        sensorNameString = `sensor "${sensorName}"`;
    } else {
        sensorNameString = `a sensor`;
    }

    // TODO: This would be nicer to maintain by SES templates
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>Ruuvi sensor was shared with you</h1>
            <p>
                Ruuvi Network user ${sharerName} shared "${sensorNameString}" with you.
            </p>
            <p>
                Log in to the mobile application to view it!
            </p>
        </body>
      </html>
    `;

    return await sendEmail(email, `${sharerName} shared a Ruuvi sensor with you`, htmlBody);
};

/**
 * Sends a notification when a sensor the user shared is removed
 *
 * @param {string} email
 * @param {string} sensorName
 * @param {string} shareRecipient
 * @param {string} sourceDomain
 */
const sendShareRemovedNotification = async (email, sensorName, shareRecipient) => {
    let sensorNameString = '';
    if (sensorName) {
        sensorNameString = `sensor "${sensorName}"`;
    } else {
        sensorNameString = `a sensor`;
    }

    // TODO: This would be nicer to maintain by SES templates
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>Ruuvi sensor share was removed by user</h1>
            <p>
                Ruuvi Network user ${shareRecipient} removed shared ${sensorNameString}.
            </p>
        </body>
      </html>
    `;

    return await sendEmail(email, `${shareRecipient} removed a Ruuvi sensor you had shared`, htmlBody);
};

module.exports = {
    sendEmailVerification,
    sendResetEmail,
    sendShareNotification,
    sendShareRemovedNotification,
    sendAlertEmail,
    sendEmailInvitation
};
