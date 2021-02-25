const validator = require('../../Helpers/validator.js');

test('verify setting returns true on valid input', () => {
    var isValid = validator.validateSettingName('abba-cd.123_kek');
	expect(isValid).toBe(true);
});

test('verify setting returns false on invalid input', () => {
    var isValid = validator.validateSettingName('abba"-cd!.123_kek');
	expect(isValid).toBe(false);
});