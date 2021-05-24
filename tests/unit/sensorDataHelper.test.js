const dataHelper = require('../../Helpers/sensorDataHelper');

const successfulCases = [
	{
		data: '0201061BFF99040510C23854BDDEFFE800000408B776B83020EF544AE71D9E',
		temperature: 21.45,
		humidity: 36.05,
		pressure: 986.06
	},
	//'0201061BFF99040510BC387CBDD8FFDC00000400B776B72F36EF544AE71D9E',
	//'0201061BFF99040510BC39C1BDD5FFE0000403F4B836B72F45EF544AE71D9E',
	//'0201061BFF99040510BC3966BDD5FFE8FFFC0400B776B72F55EF544AE71D9E',
	//'0201061BFF99040510BC3962BDD3FFE0FFFC03FCB5F6B72F5EEF544AE71D9E',

	// Specific cases
	//'0201061BFF99040512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F', // Valid data
	//'0201061BFF9904058001000000008001800180010000000000CBB8334C884F', // Min values
	//'0201061BFF9904057FFFFFFEFFFE7FFF7FFF7FFFFFDEFEFFFECBB8334C884F', // Max values


	/*'02011A020A070BFF4C001006201E4E56B3A9',
	'02011A020A180AFF4C0010050118236914',
	'02011A03036FFD17166FFD4FB6C1AB8ED38FB0AC9A664C33A2DA21AC096709',
	'02011A020A070BFF4C001006201E4E56B3A9'*/
];

const failingCases = [
	
];

successfulCases.forEach(function(testCase) {
	test('verify parsing a valid payload returns correct answer: ' + testCase.data, () => {
		const result = dataHelper.parseData(testCase.data, 5);
		expect(result).not.toBe(null);
		expect(result.temperature).toBe(testCase.temperature);
		expect(result.humidity).toBe(testCase.humidity);
		expect(result.pressure).toBe(testCase.pressure);
	});
});

failingCases.forEach(function(testCase) {
	test('verify parsing a invalid payload throws: ' + testCase, () => {
		expect(() => {
			const result = dataHelper.parseData(testCase, 5);
			console.log(result);
		}).toThrow();
	});
});

