const { test, expect } = require('@jest/globals');
const emailHelper = require('../../Helpers/emailHelper');

const testEmails = [
  ['test.test@hotmail.com', 't***.***t@h*****l.com'],
  ['hippo@huppo.com', 'h***o@h***o.com']
];

/**
 * "First + ... + last@first + ... + domain"
 */
test('masks email correctly', () => {
  for (const email of testEmails) {
    const maskRes = emailHelper.maskEmail(email[0]);
    expect(maskRes).toBe(email[1]);
  }
});
