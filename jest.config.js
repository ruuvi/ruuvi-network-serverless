// jest.config.js
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  // verbose: true,
  testTimeout: 90000,
  testEnvironment: 'node',
  collectCoverage: true,
  testResultsProcessor: "jest-sonar-reporter",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/"
  ]
};

module.exports = config;
