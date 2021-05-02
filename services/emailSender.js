const aws = require('aws-sdk');
const ses = new aws.SES({
    region: 'eu-central-1'
});
const validator = require('../Helpers/validator');

exports.handler = async (event) => {
    let emails = 0;

    const from = process.env.SOURCE_EMAIL;

    for (const { messageId, body, messageAttributes } of event.Records) {
        console.log(messageAttributes);
        console.log(body);
        if (!validator.hasKeys(messageAttributes, ['TargetEmail', 'Title'])) {
            console.error("One of necessary arguments missing: TargetEmail, Title");
            console.info(messageAttributes);
            continue;
        }

        if (!body) {
            console.error("E-mail body is missing.");
            console.info(messageAttributes);
            continue;
        }

        const title = messageAttributes.Title.StringValue;
        const email = messageAttributes.TargetEmail.StringValue;

        const fromBase64 = Buffer.from(from).toString('base64');
        const noReplyAddress = 'noreply@' + from.substring(from.indexOf('@') + 1);
    
        console.log(title);
        console.log(email);
        console.log(fromBase64);
        console.log(noReplyAddress);
        console.log(body);

        const emailParams = {
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

        try {
            console.info("Sending email from " + from + " to " + email + " with title: " + title);
            return ses.sendEmail(emailParams).promise();
        } catch (e) {
            console.error('Error sending email', e);
            continue;
        }
    }

    return `Sent out ${emails} emails.`;
};
