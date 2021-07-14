const auth = require('../../Helpers/authHelper');

const timestamp = '1625672467';
const signature = '9214aff4e8588778fecb4ead4ec420b6de18692ee53bf628ba3bae0aaac44f2c';
const secret = 'Ruuvi';
const data = '{\n' +
'\t"data":\t{\n' +
'\t\t"coordinates":\t"",\n' +
'\t\t"timestamp":\t"1625672467",\n' +
'\t\t"nonce":\t"1602509887",\n' +
'\t\t"gw_mac":\t"F9:15:8F:92:D8:69",\n' +
'\t\t"tags":\t{\n' +
'\t\t\t"DA:3E:ED:2B:0E:B9":\t{\n' +
'\t\t\t\t"rssi":\t-66,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF9904051666409AC96D00BC03E0FFF453F63356DCDA3EED2B0EB9"\n' +
'\t\t\t},\n' +
'\t\t\t"E3:62:B1:5A:78:60":\t{\n' +
'\t\t\t\t"rssi":\t-59,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516A43F1CC875FFD8FF2C03D48896BCB68FE362B15A7860"\n' +
'\t\t\t},\n' +
'\t\t\t"CE:19:50:1D:50:A5":\t{\n' +
'\t\t\t\t"rssi":\t-56,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF99040516F85984C8E50318FD54005CBAD64DE9FECE19501D50A5"\n' +
'\t\t\t},\n' +
'\t\t\t"DA:C5:85:4C:6E:CC":\t{\n' +
'\t\t\t\t"rssi":\t-53,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF99040516263C17C8850050FFD0042CADB6DDFCC1DAC5854C6ECC"\n' +
'\t\t\t},\n' +
'\t\t\t"D0:C5:B0:0F:46:37":\t{\n' +
'\t\t\t\t"rssi":\t-51,\n' +
'\t\t\t\t"timestamp":\t"1625672464",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516A34097C8CF016C03E80044619601E127D0C5B00F4637"\n' +
'\t\t\t},\n' +
'\t\t\t"DC:E1:78:F9:1F:85":\t{\n' +
'\t\t\t\t"rssi":\t-60,\n' +
'\t\t\t\t"timestamp":\t"1625672464",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516EF43A8C86FFE200074035C3AD66FEBB1DCE178F91F85"\n' +
'\t\t\t},\n' +
'\t\t\t"F5:4F:92:06:77:95":\t{\n' +
'\t\t\t\t"rssi":\t-66,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516A048B0C8E5FFECFFC0FBCC89F69BE344F54F92067795"\n' +
'\t\t\t},\n' +
'\t\t\t"F6:81:DD:6E:FE:D8":\t{\n' +
'\t\t\t\t"rssi":\t-29,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF99040518E44B5AC944002800240400A2966C4404F681DD6EFED8"\n' +
'\t\t\t},\n' +
'\t\t\t"C0:4D:B1:4A:B6:35":\t{\n' +
'\t\t\t\t"rssi":\t-64,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516663C8EC923FFB0003403FC8ED60D4640C04DB14AB635"\n' +
'\t\t\t},\n' +
'\t\t\t"C5:AF:B9:B9:E8:52":\t{\n' +
'\t\t\t\t"rssi":\t-55,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF990405EE7D72BBC98FFFDC000003E4627678EA31C5AFB9B9E852"\n' +
'\t\t\t},\n' +
'\t\t\t"C6:02:66:2B:09:C8":\t{\n' +
'\t\t\t\t"rssi":\t-54,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516A642B4C853FC8C01C4009C9CD6121E28C602662B09C8"\n' +
'\t\t\t},\n' +
'\t\t\t"DD:99:0A:C1:AA:B7":\t{\n' +
'\t\t\t\t"rssi":\t-52,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF99040516265C80C856FE5400E00384B51636E6B4DD990AC1AAB7"\n' +
'\t\t\t},\n' +
'\t\t\t"ED:1E:4E:19:B2:6D":\t{\n' +
'\t\t\t\t"rssi":\t-52,\n' +
'\t\t\t\t"timestamp":\t"1625672466",\n' +
'\t\t\t\t"data":\t"0201061BFF99040516874426C91D0004FFF40410AAF6B02765ED1E4E19B26D"\n' +
'\t\t\t},\n' +
'\t\t\t"EC:03:2B:EE:09:0A":\t{\n' +
'\t\t\t\t"rssi":\t-66,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"02010611FF9904034D1B62C8B1013500CBFC680BA1"\n' +
'\t\t\t},\n' +
'\t\t\t"E5:83:B4:04:90:52":\t{\n' +
'\t\t\t\t"rssi":\t-46,\n' +
'\t\t\t\t"timestamp":\t"1625672466",\n' +
'\t\t\t\t"data":\t"0201061BFF99040515C5600FC8930054FFBC0420A7F623E9D6E583B4049052"\n' +
'\t\t\t},\n' +
'\t\t\t"C4:A3:42:45:02:3F":\t{\n' +
'\t\t\t\t"rssi":\t-60,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516903D27C8A30000FFE0FBF09A3612FA5CC4A34245023F"\n' +
'\t\t\t},\n' +
'\t\t\t"E7:AE:AB:82:FD:A9":\t{\n' +
'\t\t\t\t"rssi":\t-49,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF990405164E3D63C8EFFC24009CFFECAC36BBCDCAE7AEAB82FDA9"\n' +
'\t\t\t},\n' +
'\t\t\t"E5:76:FD:F2:1A:2F":\t{\n' +
'\t\t\t\t"rssi":\t-64,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516893E27C88BFF20012CFC889B9674119EE576FDF21A2F"\n' +
'\t\t\t},\n' +
'\t\t\t"F2:86:69:1B:B0:5A":\t{\n' +
'\t\t\t\t"rssi":\t-63,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201041BFF990405166140ABC90BFF70FF0403D8A376F31FBDF286691BB05A"\n' +
'\t\t\t},\n' +
'\t\t\t"E0:E3:2B:22:F4:F5":\t{\n' +
'\t\t\t\t"rssi":\t-65,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF99040501775356C885002000040400A3768F88BDE0E32B22F4F5"\n' +
'\t\t\t},\n' +
'\t\t\t"E9:D5:4B:FE:15:E7":\t{\n' +
'\t\t\t\t"rssi":\t-45,\n' +
'\t\t\t\t"timestamp":\t"1625672463",\n' +
'\t\t\t\t"data":\t"0201041BFF990405169455FEC8BCFFE4FFEC042474D65086FFE9D54BFE15E7"\n' +
'\t\t\t},\n' +
'\t\t\t"FB:97:4E:97:DE:5C":\t{\n' +
'\t\t\t\t"rssi":\t-59,\n' +
'\t\t\t\t"timestamp":\t"1625672463",\n' +
'\t\t\t\t"data":\t"0201061BFF99040516163C71C8BFFBF4FFE40060AF3644CD7DFB974E97DE5C"\n' +
'\t\t\t},\n' +
'\t\t\t"D4:94:E2:D7:E9:05":\t{\n' +
'\t\t\t\t"rssi":\t-56,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF990405162A52A0C890003C001003D09A5620C2A9D494E2D7E905"\n' +
'\t\t\t},\n' +
'\t\t\t"F7:71:BB:12:70:E1":\t{\n' +
'\t\t\t\t"rssi":\t-47,\n' +
'\t\t\t\t"timestamp":\t"1625672465",\n' +
'\t\t\t\t"data":\t"0201061BFF990405162E5360C8940038FFB4041CA316EDC31DF771BB1270E1"\n' +
'\t\t\t},\n' +
'\t\t\t"D2:CE:15:1E:30:9C":\t{\n' +
'\t\t\t\t"rssi":\t-60,\n' +
'\t\t\t\t"timestamp":\t"1625672466",\n' +
'\t\t\t\t"data":\t"0201041BFF990405166E3DE1C895FC34003C0034A1B6033290D2CE151E309C"\n' +
'\t\t\t},\n' +
'\t\t\t"DF:06:DC:BA:79:3A":\t{\n' +
'\t\t\t\t"rssi":\t-49,\n' +
'\t\t\t\t"timestamp":\t"1625672466",\n' +
'\t\t\t\t"data":\t"0201041BFF99040516DAFFFFFFFF038C02000028A3766698B8DF06DCBA793A"\n' +
'\t\t\t}\n' +
'\t\t}\n' +
'\t}\n' +
'}';

const data2 = '{\n' +
'\t"data":\t{\n' +
'\t\t"coordinates":\t"",\n' +
'\t\t"timestamp":\t"1625873260",\n' +
'\t\t"nonce":\t"4171214409",\n' +
'\t\t"gw_mac":\t"C8:25:2D:8E:9C:2C",\n' +
'\t\t"tags":\t{\n' +
'\t\t\t"E3:75:CF:37:4E:23":\t{\n' +
'\t\t\t\t"rssi":\t-63,\n' +
'\t\t\t\t"timestamp":\t"1625873259",\n' +
'\t\t\t\t"data":\t"0201061BFF99040512824DF2BE4BFC300100FFE0AF36461DF9E375CF374E23"\n' +
'\t\t\t},\n' +
'\t\t\t"F4:1F:0C:28:CB:D6":\t{\n' +
'\t\t\t\t"rssi":\t-58,\n' +
'\t\t\t\t"timestamp":\t"1625873260",\n' +
'\t\t\t\t"data":\t"0201061BFF990405147445D1BEBAFC70FE30FFF8B2F65202AFF41F0C28CBD6"\n' +
'\t\t\t},\n' +
'\t\t\t"C6:A5:B9:E0:AD:06":\t{\n' +
'\t\t\t\t"rssi":\t-72,\n' +
'\t\t\t\t"timestamp":\t"1625873257",\n' +
'\t\t\t\t"data":\t"0201061BFF990405126A4A37BE98010CFBEC001CAF36DF1D33C6A5B9E0AD06"\n' +
'\t\t\t}\n' +
'\t\t}\n' +
'\t}\n' +
'}';

const signature2 = '2d2c861fb143d9096f81bf33043dbee4e76a912ba4043fc6a346858e2ad85e43';
const secret2 = '40:98:A7:78:58:1A:E1:38';

test('fox', () => {
	const expected = 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
	const data = "The quick brown fox jumps over the lazy dog";

	const result = auth.validateSignature(expected, data, 1625672463, 100000000000000, 'key');
	expect(result).toBe(true);
});

test('verify validates correct signature', () => {
	const result = auth.validateSignature(signature, data, timestamp, 100000000000, secret);
	expect(result).toBe(true);
});

test('verify validates correct signature real gw', () => {
	const result = auth.validateSignature(signature2, data2, timestamp, 100000000000, 'Ruuvi');
	expect(result).toBe(true);
});
