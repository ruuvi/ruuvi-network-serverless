const redis = require('../Helpers/redisHelper').getClient();
const sqlHelper = require('../Helpers/sqlHelper');
const alertHelper = require('../Helpers/alertHelper');

exports.handler = async (event) => {
    const enabledAlerts = await sqlHelper.fetchAll('`enabled`', '1', 'sensor_alerts');
    let refreshedAlerts = 0;

    if (enabledAlerts.length > 0) {
        for (let alert of enabledAlerts) {
            try {
                await alertHelper.refreshAlertCache(alert.sensor_id, redis);
                refreshedAlerts++;
            } catch (e) {
                console.log('error', e);
            }
        }
    }

    await sqlHelper.disconnect();

    return `Refreshed ${refreshedAlerts} alerts.`;
};
