// Test data to poke the API with
const deviceId = '1234';
const deviceAddr = '5678';
const nonce = 'nonsense!';
const timestamp = Date.now();
const postData = {
  data:	{
    coordinates: '',
    timestamp: 133,
    gwmac: 'abbacd',
    tags:	{
      '76EA4D1D1021':	{
        rssi:	-76,
        timestamp: 1595333605932,
        data:	'02011A020A0C0AFF4C001005031C6E57DD'
      },
      '5575B388898D':	{
        rssi:	-52,
        timestamp: 1595198605932,
        data:	'1EFF06000109200230E6726EBD7FD084DFC33558D954149C321F735CC51159'
      },
      '6C4008A1C25D':	{
        rssi:	-48,
        timestamp: 1595198605933,
        data:	'0201060AFF4C0010054B1C6C9ED5'
      },
      '655D7925361D':	{
        rssi:	-52,
        timestamp: 1595198605934,
        data:	'02010613FF4C000C0E00BC32D7E1B0C296ADA26E8632C9'
      },
      '16FD6FF63364':	{
        rssi:	-62,
        timestamp: 1595198605936,
        data:	'1EFF0600010920029E258660E0B062F2FFB868D9337736E2CD2038057DB9BD'
      },
      F63A84A8E4CF:	{
        rssi:	-24,
        timestamp: 1595198605933,
        data:	'0201041BFF990405154636CDC88B004C002403F079B6FFFFFFF63A84A8E4CF'
      },
      '654FF6FE52A8':	{
        rssi:	-27,
        timestamp: 1595198605933,
        data:	'0201060AFF4C001005451CED6715'
      },
      '47B73797431A':	{
        rssi:	-39,
        timestamp: 1595198605933,
        data:	'02011A020A0C0BFF4C0010060B1E4B03D47C'
      },
      '442CFAA838B8':	{
        rssi:	-50,
        timestamp: 1595198605933,
        data:	'1EFF0600010F2002CFBF43DCD33C599D71FFE3E2267A581766B8F09F2008DC'
      },
      F40F2438E2E9:	{
        rssi:	-62,
        timestamp: 1595198605933,
        data:	'0201060AFF4C0010054B1C263A26'
      },
      '7C0E31B04AD5':	{
        rssi:	-62,
        timestamp: 1595198605933,
        data:	'02010613FF4C000C0E08EACB2EA8DA2B709A34DF1FD2B2'
      },
      '4A251258A167':	{
        rssi:	-45,
        timestamp: 1595198605933,
        data:	'02011A020A0C0BFF4C001006031E82AC36B5'
      },
      '7C5B1B365242':	{
        rssi:	-72,
        timestamp: 1595198605933,
        data:	'0201060AFF4C0010050B1C60D1AF'
      },
      '791BD51E1A27':	{
        rssi:	-51,
        timestamp: 1595198605933,
        data:	'02011A020A0C0BFF4C001006471E1B522613'
      },
      '323CB5C0FB57':	{
        rssi:	-73,
        timestamp: 1595198605933,
        data:	'1EFF060001092002BB132272588BDD97624C64193F2DF14528D59D26D56D07'
      },
      '194488332F62':	{
        rssi:	-87,
        timestamp: 1595198605933,
        data:	'1EFF06000109200277931B5F7B618C7D5396EAACDB4E476FC2361A6FD44932'
      },
      DAB59BDFA9BB:	{
        rssi:	-56,
        timestamp: 1595198605933,
        data:	'0201041BFF99040512954B2FC8880074FF7004006976E2A7A6DAB59BDFA9BB'
      },
      '15082A6773B2':	{
        rssi:	-73,
        timestamp: 1595198605933,
        data:	'1EFF0600010920025FDE9F9234847B66681BB2CC17209976F602936034AE46'
      },
      '74F6D8A52FB4':	{
        rssi:	-68,
        timestamp: 1595198605933,
        data:	'02011A020A0C0BFF4C001006131E56BCEC09'
      },
      '0016A40FB3CD':	{
        rssi:	-62,
        timestamp: 1595198605933,
        data:	'0201060319E00016FF150264E0001E06F054ABE5BC4CB681BC11AFEB0BC2'
      },
      '31B04AD52CE9':	{
        rssi:	-60,
        timestamp: 1595198605933,
        data:	'0201060AFF4C0010054B1C263A26'
      },
      D70411EBCE76:	{
        rssi:	-73,
        timestamp: 1595198605933,
        data:	'031900000201061107275125077B182691364CDD843CFC39D8'
      },
      '657C2C25361D':	{
        rssi:	-77,
        timestamp: 1595198605933,
        data:	'02010613FF4C000C0E00BC32D7E1B0C296ADA26E8632C9'
      },
      '3AC40F493821':	{
        rssi:	-75,
        timestamp: 1595198605933,
        data:	'1EFF060001092002E76BF96742B4855B5E1FE0DAB4367FC6C0D1B8D37E8812'
      }
    }
  }
};

const createSignature = (data, nonce, timestamp, secret) => {
  let dataStr = data;
  if (typeof data !== 'string') {
    dataStr = JSON.stringify(data);
  }

  const signatureBody = secret + nonce + timestamp + dataStr;

  const crypto = require('crypto');

  return crypto.createHmac('sha256', secret)
    .update(signatureBody)
    .digest('hex');
};

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSignature (postData, secret) {
  const https = require('https');

  const data = JSON.stringify(postData);

  const signature = createSignature(data, nonce, timestamp, secret);
  console.log('Calculated signature: ' + signature);

  const options = {
    hostname: '1bdtypmdv4.execute-api.eu-central-1.amazonaws.com',
    port: 443,
    path: '/record',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'x-ruuvi-signature': signature,
      'x-ruuvi-timestamp': timestamp,
      'x-ruuvi-nonce': nonce
    }
  };

  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on('data', d => {
      process.stdout.write(d);
    });
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

testSignature(postData, deviceId + deviceAddr);
