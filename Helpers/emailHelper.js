const aws = require('aws-sdk');
const ses = new aws.SES({region: 'eu-central-1'});

const sendEmail = async (email, from, title, body) => {
    const fromBase64 = Buffer.from(from).toString('base64');
    const noReplyAddress = 'no-reply@' + from.substring(from.indexOf('@') + 1);

    const params = {
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: body
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: title
            }
        },
        Source: `=?utf-8?B?${fromBase64}?= <${from}>`,
        ReplyToAddresses: [noReplyAddress]
    };
    return ses.sendEmail(params).promise();
};

const sendEmailVerification = async (email, token, from, sourceDomain) => {
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

    return sendEmail(email, from, "Ruuvi Account E-mail Confirmation", htmlBody);
};

const sendResetEmail = async (email, token, from, sourceDomain) => {
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

    return sendEmail(email, from, "Ruuvi Account Reset Confirmation", htmlBody);
};

const sendShareNotification = async (email, sensorName, sharerName, from, sourceDomain) => {
    let domain = process.env.BASE_API_URL;
    if (sourceDomain) {
        domain = sourceDomain;
    }

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

    return sendEmail(email, from, `${sharerName} shared a Ruuvi sensor with you`, htmlBody);
};

/**
 * Sends a notification when a sensor the user shared is removed
 *
 * @param {string} email
 * @param {string} sensorName
 * @param {string} shareRecipient
 * @param {string} from
 * @param {string} sourceDomain
 */
const sendShareRemovedNotification = async (email, sensorName, shareRecipient, from, sourceDomain) => {
    let domain = process.env.BASE_API_URL;
    if (sourceDomain) {
        domain = sourceDomain;
    }

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

    return sendEmail(email, from, `${shareRecipient} removed a Ruuvi sensor you had shared`, htmlBody);
};

module.exports = {
    sendEmailVerification,
    sendResetEmail,
    sendShareNotification,
    sendShareRemovedNotification
};
