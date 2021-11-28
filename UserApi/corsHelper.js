const gatewayHelper = require('../Helpers/gatewayHelper');

exports.handler = async (event, context) => {
  return gatewayHelper.ok();
};
