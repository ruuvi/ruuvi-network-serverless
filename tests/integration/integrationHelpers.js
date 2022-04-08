const hexCharacters = '0123456789ABCDEF';

function randomHex (length) {
  let result = '';
  const charactersLength = hexCharacters.length;
  for (let i = 0; i < length; i++) {
    result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
    result += hexCharacters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/* Creates a random mock hex address that starts with "00:"
 * It should be noted that Ruuvi devices use BLE Random MAC addresses as identifiers,
 * so real devices will always start with top two bits set i.e. 0xC0... 0xFF
 */
function randomMac () {
  const hexes = ['00'];
  for (let i = 0; i < 5; i++) {
    hexes.push(randomHex(1));
  }
  return hexes.join(':');
}

module.exports = {
  randomHex,
  randomMac
};
