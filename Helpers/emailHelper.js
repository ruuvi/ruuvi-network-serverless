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

const sendEmailVerification = async (email, token, from) => {
    const link = `${process.env.BASE_API_URL}/verify?token=${token}`;

    // TODO: This would be nicer to maintain by SES templates
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>Confirm your account e-mail!</h1>
            <p>
                Please follow <a href="${link}">this link</a> to confirm your e-mail.
            </p>
        </body>
      </html>
    `;

    return sendEmail(email, from, "Ruuvi Account E-mail Confirmation", htmlBody);
};

const sendResetEmail = async (email, token, from) => {
    const link = `${process.env.BASE_API_URL}/verify?token=${token}`;

    // TODO: This would be nicer to maintain by SES templates
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
            <h1>Reset your credentials!</h1>
            <p>
                Please follow <a href="${link}">this link</a> to reset your credentials.
            </p>
        </body>
      </html>
    `;

    return sendEmail(email, from, "Ruuvi Account Reset Confirmation", htmlBody);
};


module.exports = {
    sendEmailVerification,
    sendResetEmail
};