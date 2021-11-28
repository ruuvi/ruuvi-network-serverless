const validator = require('../Helpers/validator');
const sqlHelper = require('../Helpers/sqlHelper');
const sesHelper = require('../Helpers/sesHelper');

exports.handler = async (event) => {
  const stageIdentifier = process.env.SOURCE_STAGE !== 'prod' ? `${process.env.SOURCE_STAGE}-` : '';
  const from = process.env.SOURCE_EMAIL;

  let success = 0;
  let error = 0;

  for (const { messageId, body, messageAttributes } of event.Records) {
    // Common dependencies
    if (!validator.hasKeys(messageAttributes, ['TargetEmail'])) {
      console.error('One of necessary arguments missing: TargetEmail');
      console.info(messageAttributes);
      continue;
    }

    const email = messageAttributes.TargetEmail.stringValue;

    // Verify that e-mails are not disabled
    try {
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
    } catch (e) {
      console.error('Failed to fetch user email fetching information: ' + email);
    }

    // Check for SES flow
    console.log(`Sending email to ${email} from ${from} template ${messageAttributes.Template.stringValue}`);
    console.log('Message body variables', body);
    if (validator.hasKeys(messageAttributes, ['Template'])) {
      try {
        const result = await sesHelper.sendTemplated(
          email,
                    `${stageIdentifier}${messageAttributes.Template.stringValue}`,
                    body,
                    from
        );
        console.log(`Email result for ${email}`, result);
        success++;
      } catch (e) {
        console.error('Error sending templated email', e);
        error++;
      }
    } else {
      console.error('Invalid message attributes - no `Template` defined.', messageAttributes);
      error++;
    }
  }

  await sqlHelper.disconnect();

  console.log(`Sent out ${success} emails, ${error} failed.`);

  return `Sent out ${success} emails, ${error} failed.`;
};
