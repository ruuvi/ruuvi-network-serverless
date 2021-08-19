const aws = require('aws-sdk');
const ses = new aws.SES({
    region: 'eu-central-1'
});
const validator = require('../Helpers/validator');
const sqlHelper = require('../Helpers/sqlHelper');

exports.handler = async (event) => {
    let emails = 0;

    const from = process.env.SOURCE_EMAIL;

    for (const { messageId, body, messageAttributes } of event.Records) {
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

        const title = messageAttributes.Title.stringValue;
        const email = messageAttributes.TargetEmail.stringValue;

        // Verify that e-mails are not disabled
        const user = await sqlHelper.fetchSingle('email', email, 'users');
        if (user !== null) {
            const userSettings = await sqlHelper.fetchAll('`key`', 'disable_emails', 'user_settings');
            if (userSettings.length > 0) {
                const disabledSetting = userSettings.find(setting => parseInt(setting.user_id) == parseInt(user.id));
                if (parseInt(disabledSetting.value) === 1) {
                    console.log(`Email not sent to ${email} because emails are disabled.`);
                    continue;
                }
            }
        }

        const fromBase64 = Buffer.from(from).toString('base64');
        const noReplyAddress = 'noreply@' + from.substring(from.indexOf('@') + 1);
    
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
