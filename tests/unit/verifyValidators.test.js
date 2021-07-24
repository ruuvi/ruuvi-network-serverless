const validator = require('../../Helpers/validator.js');

const valid = [
    'kek.default.file',
    'abbacd',
    'aba-baba.jpg',
    'abcdefghijklmnopqrstuvwxyz1234567890',
    '-_'
];

const invalid = [
    'http://kek.default.file',
    '^kek',
    '\\',
    '//',
    ':'
];

test('verify filename returns true on valid input', () => {
    for (let v of valid) {
        var isValid = validator.validateFilename(v);
	    expect(isValid).toBe(true);
    }
});

test('verify filename returns false on URL', () => {
    for (let i of invalid) {
        var isValid = validator.validateFilename(i);
	    expect(isValid).toBe(false);
    }
});