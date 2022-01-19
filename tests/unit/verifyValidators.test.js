const { test, expect } = require('@jest/globals');
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
  for (const v of valid) {
    const isValid = validator.validateFilename(v);
    expect(isValid).toBe(true);
  }
});

test('verify filename returns false on URL', () => {
  for (const i of invalid) {
    const isValid = validator.validateFilename(i);
    expect(isValid).toBe(false);
  }
});

test('verify string returns false on empty string', () => {
  const isValid = validator.validateString('');
  expect(isValid).toBe(false);
});

test('verify string returns false on non-string', () => {
  const isValid = validator.validateString(1337);
  expect(isValid).toBe(false);
});

test('verify string returns true on string', () => {
  const isValid = validator.validateString('Test string ok');
  expect(isValid).toBe(true);
});
