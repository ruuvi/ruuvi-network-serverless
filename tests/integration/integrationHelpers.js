const hexCharacters = '0123456789ABCDEF';

function randomHex(length) {
	var result = '';
	var charactersLength = hexCharacters.length;
	for (var i = 0; i < length; i++) {
		result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
		result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

module.exports = {
	randomHex
}
