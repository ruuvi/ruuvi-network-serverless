const alerts = require('../../Helpers/alertHelper.js');

// From default unit to target unit
const testCases = [
    // Default: Celcius
    ['F', '°F', 0, 32, 'temperature'],
    ['DBM', ' dBm', 5, 5, 'signal'],

    ['TIMES', ' times', 6, 6, 'movement'],

    ['C', '°C', 7, 7, 'temperature'],
    ['F', '°F', 8, 46.4, 'temperature'],
    ['K', '°K', 5, 278.15, 'temperature'],

    ['0', ' Pa', 100, 100, 'pressure'],
    ['1', ' hPa', 200, 2, 'pressure'],
    ['2', ' mmHg', 300, 2.250191266257632, 'pressure'],
    ['3', ' inHg', 400, 0.11812, 'pressure'],

    ['0', '%', 12, 12, 'humidity'],
    ['1', ' g/m³', 13, 13, 'humidity'], // TODO:
    ['2', '°', 14, 14, 'humidity'], // TOOD
];

testCases.forEach((testCase) => {
    test(`verify conversions work to ${testCase[0]} (${testCase[1]}) for value ${testCase[2]} -> ${testCase[3]}`, () => {
        let symbol = null;
        let value = null;
        [symbol, value] = alerts.convertValue(testCase[0], testCase[2], testCase[4]);
        expect(symbol).toBe(testCase[1], `Case: ${testCase[0]}: ${testCase[2]} -> ${testCase[3]}`);
        expect(value).toBe(testCase[3], `Case: ${testCase[0]}: ${testCase[2]} -> ${testCase[3]}`);
    });
});