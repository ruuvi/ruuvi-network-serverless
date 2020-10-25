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

function randomMac() {
	let hexes = [];
	for (let i = 0; i < 6; i++) {
		hexes.push(randomHex(1)); 
	}
	return hexes.join(':');
}

module.exports = {
	randomHex,
	randomMac
}
