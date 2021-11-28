const redisHelper = require('../Helpers/redisHelper');
const sqlHelper = require('../Helpers/sqlHelper');

exports.handler = async (event) => {
  console.log('entered function');
  const client = redisHelper.getClient();

  console.log('client created');

  let value = 'empty';
  try {
    await client.set('string key', 'string val');
    console.log('value set');
    value = await client.get('string key');
    console.log('value gotten: ' + value);
    await client.del('string key');
  } catch (e) {
    console.log(e);
  } finally {
    console.log(value);
  }

  console.log(await sqlHelper.fetchSingle('id', 1, 'users'));

  return value;
};
