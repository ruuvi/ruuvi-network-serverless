const gatewayHelper = require('../Helpers/gatewayHelper');

/**
 * Serves a single file for Apple file validation.
 */
exports.handler = async (event, context) => {
  return gatewayHelper.ok({
    applinks: {
      apps: [],
      details: [
        {
          appID: process.env.APP_ID,
          paths: ['/verify/*']
        }
      ]
    }
  });
};
