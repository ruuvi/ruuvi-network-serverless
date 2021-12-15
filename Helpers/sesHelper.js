const AWS = require('aws-sdk');
const ses = new AWS.SES({
  region: 'eu-central-1',
  apiVersion: '2010-12-01'
});

const sendTemplated = async (email, template, templateData, from) => {
  const noReplyAddress = 'noreply@' + from.substring(from.indexOf('@') + 1);

  let fromString = from;
  if (process.env.SOURCE_EMAIL_NAME) {
    const fromName = process.env.SOURCE_EMAIL_NAME;
    fromString = `${fromName} <${from}>`;
  }

  const params = {
    Destination: {
      ToAddresses: [email]
    },
    Source: fromString, /* required */
    Template: template, /* required */
    TemplateData: templateData, /* required */
    ReplyToAddresses: [noReplyAddress]
  };

  return ses.sendTemplatedEmail(params).promise();
};

module.exports = {
  sendTemplated
};
