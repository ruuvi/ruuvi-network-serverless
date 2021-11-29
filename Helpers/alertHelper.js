let redis = null;
if (process.env.REDIS_HOST) {
  redis = require('../Helpers/redisHelper').getClient();
}
const sqlHelper = require('../Helpers/sqlHelper');
const emailHelper = require('../Helpers/emailHelper');
const throttleHelper = require('../Helpers/throttleHelper');

/**
 * Fetches alerts for individual sensor
 */
const getCachedAlerts = async (sensor) => {
  const alerts = await redis.get('alerts_' + sensor);
  if (alerts === null) {
    return [];
  }
  const parsed = JSON.parse(alerts);
  const formatted = formatAlerts(parsed);
  return formatted;
};

/**
 * Refreshes the redis cache for an individual sensor.
 *
 * @param {string} sensor Sensor ID
 */
const refreshAlertCache = async (sensor, data = null) => {
  if (data === null) {
    data = await getAlerts(sensor, null, false, true);
  }

  const active = [];
  data.forEach((alert) => {
    if (alert.enabled) {
      active.push(alert);
    }
  });

  if (active.length === 0) {
    await redis.del('alerts_' + sensor);
  } else {
    const ttl = 60 * 60 * 24 * 2;
    await redis.set('alerts_' + sensor, JSON.stringify(active), 'EX', ttl);
  }
};

/**
 * Fetches alerts for individual sensor
 *
 * @param {string} sensor Sensor ID
 * @param {userId} mixed int or null, if null, will fetch for all users
 * @param {useCache} bool If true, will only access cache
 */
const getAlerts = async (sensor, userId = null, useCache = false, returnRaw = false) => {
  if (useCache) {
    const cachedAlerts = await getCachedAlerts(sensor);
    return cachedAlerts;
  }

  const raw = await sqlHelper.fetchAlerts(sensor, userId);
  if (raw === null) {
    return [];
  }

  // Cache holds all alerts for a sensor; only refresh when all alerts are fetched from database
  if (userId === null) {
    await refreshAlertCache(sensor, raw);
  }

  return returnRaw ? raw : formatAlerts(raw);
};

/**
 * Formats the alerts to the outputtable format.
 *
 * @param {array} raw Raw alerts from database
 */
const formatAlerts = (raw) => {
  const formatted = [];
  for (const alert of raw) {
    formatted.push({
      userId: alert.user_id,
      sensorId: alert.sensor_id,
      type: alert.alert_type,
      min: alert.min_value,
      max: alert.max_value,
      counter: alert.counter,
      enabled: !!alert.enabled,
      offsetHumidity: alert.offset_humidity,
      offsetTemperature: alert.offset_temperature,
      offsetPressure: alert.offset_pressure,
      description: alert.description,
      triggered: !!alert.triggered,
      triggeredAt: alert.triggered_at
    });
  }
  return formatted;
};

/**
 * Stores an alert and puts it to a redis cache for faster look-up.
 *
 * @param {*} userId
 * @param {*} sensor
 * @param {*} type
 * @param {*} min
 * @param {*} max
 * @param {*} enabled
 * @returns true on success and false on error.
 */
const putAlert = async (userId, sensor, type, min = Number.MIN_VALUE, max = Number.MAX_VALUE, counter = 0, enabled = true, description = '') => {
  // Assume failure
  let putResult = false;
  try {
    putResult = await sqlHelper.saveAlert(userId, sensor, type, enabled, min, max, counter, description);
    if (putResult === true) {
      // Put the alerts JSON to cache for faster look up
      await refreshAlertCache(sensor);
    }
  } catch (e) {
    console.error(e);
    putResult = false;
  }

  return putResult;
};

const UNIT_SIGNAL_DBM = 'DBM';

const UNIT_MOVEMENT_TIMES = 'TIMES';

const UNIT_TEMPERATURE_CELCIUS = 'C';
const UNIT_TEMPERATURE_FAHRENHEIT = 'F';
const UNIT_TEMPERATURE_KELVIN = 'K';

const UNIT_PRESSURE_PASCAL = '0';
const UNIT_PRESSURE_HECTOPASCAL = '1';
const UNIT_PRESSURE_MILLIMETER_OF_MERCURY = '2';
const UNIT_PRESSURE_INCH_OF_MERCURY = '3';

const UNIT_HUMIDITY_RELATIVE = '0';
const UNIT_HUMIDITY_ABSOLUTE = '1';
const UNIT_HUMIDITY_DEW_POINT = '2';

const UNIT_SYMBOLS = {
  [UNIT_SIGNAL_DBM]: [' ', 'dBm'],

  [UNIT_MOVEMENT_TIMES]: [' ', 'times'],

  [UNIT_TEMPERATURE_CELCIUS]: ['°C'],
  [UNIT_TEMPERATURE_FAHRENHEIT]: ['°F'],
  [UNIT_TEMPERATURE_KELVIN]: ['°K'],

  [UNIT_PRESSURE_PASCAL]: [' ', 'Pa'],
  [UNIT_PRESSURE_HECTOPASCAL]: [' ', 'hPa'],
  [UNIT_PRESSURE_MILLIMETER_OF_MERCURY]: [' ', 'mmHg'],
  [UNIT_PRESSURE_INCH_OF_MERCURY]: [' ', 'inHg'],

  ['H_' + UNIT_HUMIDITY_RELATIVE]: ['%'],
  ['H_' + UNIT_HUMIDITY_ABSOLUTE]: [' ', 'g/m³'],
  ['H_' + UNIT_HUMIDITY_DEW_POINT]: ['°']

};

/**
 * Gets the unit alert per type.
 *
 * @param {*} unit
 * @param {*} current
 * @param {*} alertType (for shared constants)
 * @returns Tuple with a string symbol of unit and floating-point value in given unit.
 */
const convertValue = (unit, current, alertType = null) => {
  let currentValue = current;

  if (alertType === 'humidity') {
    unit = 'H_' + unit;
  }
  const unitSymbol = UNIT_SYMBOLS[unit].join('');

  switch (unit) {
    // Defaults
    case UNIT_SIGNAL_DBM:
    case UNIT_MOVEMENT_TIMES:
    case UNIT_TEMPERATURE_CELCIUS:
    case UNIT_PRESSURE_PASCAL:
    case UNIT_HUMIDITY_RELATIVE:
      break;

      // Conversions
    case UNIT_TEMPERATURE_FAHRENHEIT:
      currentValue = parseFloat(currentValue) * 1.8 + 32;
      break;

    case UNIT_TEMPERATURE_KELVIN:
      currentValue = parseFloat(currentValue) + 273.15;
      break;

    case UNIT_PRESSURE_HECTOPASCAL:
      currentValue = parseInt(currentValue) / 100;
      break;
    case UNIT_PRESSURE_MILLIMETER_OF_MERCURY:
      currentValue = parseInt(currentValue) / 133.322;
      break;
    case UNIT_PRESSURE_INCH_OF_MERCURY:
      currentValue = parseInt(currentValue) * 0.0002953;
      break;

    case UNIT_HUMIDITY_ABSOLUTE:
      // TODO
      break;
    case UNIT_HUMIDITY_DEW_POINT:
      // TODO
      break;

    default:
      break;
  }

  return [unitSymbol, currentValue];
};

/**
 * Gets the unit constant based on the user setting.
 *
 * @param {*} alertType Type of the alert
 * @returns
 */
const getUnitSetting = async (alertType, userId) => {
  let userSetting = null;
  switch (alertType) {
    case 'temperature':
      userSetting = await sqlHelper.fetchUserSetting(userId, 'UNIT_TEMPERATURE');
      userSetting = userSetting || UNIT_TEMPERATURE_CELCIUS;
      break;
    case 'pressure':
      userSetting = await sqlHelper.fetchUserSetting(userId, 'UNIT_PRESSURE');
      userSetting = userSetting || UNIT_PRESSURE_HECTOPASCAL;
      break;
    case 'humidity':
      // userSetting = await sqlHelper.fetchUserSetting(userId, 'UNIT_HUMIDITY');
      // userSetting = userSetting ? userSetting : UNIT_HUMIDITY_RELATIVE;
      userSetting = UNIT_HUMIDITY_RELATIVE;
      break;
    case 'signal':
      userSetting = await sqlHelper.fetchUserSetting(userId, 'UNIT_SIGNAL');
      userSetting = userSetting || UNIT_SIGNAL_DBM;
      break;
    case 'movement':
      userSetting = await sqlHelper.fetchUserSetting(userId, 'UNIT_MOVEMENT');
      userSetting = userSetting || UNIT_MOVEMENT_TIMES;
      break;
  }
  return userSetting;
};

/**
 * Will set the alert triggered and proceed with any alerting actions such
 * as sending e-mails.
 *
 * @param {object} alertData Array data of the alert to be triggered
 * @param {object} sensorData Sensor info
 * @param {string} triggerType over / under
 */
const triggerAlert = async (alertData, sensorData, triggerType, overrideEnabled = false, sendEmail = true) => {
  if (!overrideEnabled && !alertData.enabled) {
    return;
  }

  const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateResult = await sqlHelper.updateValues('sensor_alerts', ['triggered = ?', 'triggered_at = ?'], [1, nowDate], ['sensor_id = ?', 'user_id = ?', 'alert_type = ?'], [alertData.sensorId, alertData.userId, alertData.type]);
  if (updateResult === 1) {
    console.log(`Updated ${alertData.type} Alert ('${triggerType}' for ${sensorData.sensor_id}) for user: ${alertData.userId}`);
    const userHelper = require('../Helpers/userHelper');
    const user = await userHelper.getById(alertData.userId);
    const sensorProfile = await sqlHelper.fetchSensorsForUser(alertData.userId, sensorData.sensor_id);

    let name = sensorData.sensor_id;
    if (sensorProfile.length > 0 && sensorProfile[0].name !== '') {
      name = sensorProfile[0].name;
    } else if (sensorProfile.length === 0) {
      console.error(`No sensor profile found for user ${alertData.userId} and sensor ${sensorData.sensor_id}. Not sending alert and refreshing cache.`);
      await refreshAlertCache(sensorData.sensor_id);
      return;
    }

    let previousValue = '';
    if (triggerType === 'under') {
      previousValue = alertData.min;
    } else if (triggerType === 'over') {
      previousValue = alertData.max;
    } else {
      previousValue = alertData.counter;
      const movementCounter = parseInt(sensorData.movementCounter);
      if (isNaN(movementCounter)) {
        console.error('Parsed Movement Counter was NaN', sensorData, alertData);
        await refreshAlertCache(sensorData.sensor_id);
        return;
      }
      await sqlHelper.updateValues(
        'sensor_alerts',
        [
          'counter = ?',
          'triggered_at = ?'
        ], [
          movementCounter,
          nowDate
        ], [
          'sensor_id = ?',
          'user_id = ?',
          'alert_type = ?'
        ], [
          alertData.sensorId,
          alertData.userId,
          'movement'
        ]
      );
    }

    if (sendEmail) {
      console.log(`Sending email for ${alertData.type} Alert (${triggerType} for sensor ${name} [${sensorData.sensor_id}]) to user: ${alertData.userId}`);
      let currentValue = alertData.type === 'movement' ? sensorData.movementCounter : sensorData[alertData.type];
      let thresholdValue = previousValue;

      const unit = await getUnitSetting(alertData.type, alertData.userId);
      const offset = getOffset(alertData);
      let alertUnit = unit;

      [alertUnit, currentValue] = convertValue(unit, currentValue + offset, alertData.type);
      [alertUnit, thresholdValue] = convertValue(unit, thresholdValue, alertData.type);

      try {
        await emailHelper.sendAlertEmail(
          user.email,
          name,
          sensorData.sensor_id,
          alertData.type,
          triggerType,
          currentValue,
          thresholdValue,
          alertUnit,
          alertData.description
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  await refreshAlertCache(sensorData.sensor_id);
};

const clearAlert = async (alertData) => {
  try {
    await sqlHelper.updateValues('sensor_alerts', ['triggered = ?'], [0], ['sensor_id = ?', 'user_id = ?', 'alert_type = ?'], [alertData.sensorId, alertData.userId, alertData.type]);
    await refreshAlertCache(alertData.sensorId);
  } catch (e) {
    console.error('Error clearing alert', e);
  }
};

const capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getOffset = (alert) => {
  const offsetKey = 'offset' + capitalize(alert.type);
  return alert.type !== 'signal' ? alert[offsetKey] : 0;
};

/**
 * Processes the alerts for a sensor
 *
 * @param {array} alerts Array of alerts
 * @param {string} data
 */
const processAlerts = async (alerts, sensorData) => {
  const throttleInterval = process.env.ALERT_THROTTLE_INTERVAL ? process.env.ALERT_THROTTLE_INTERVAL : throttleHelper.defaultIntervals.alert;

  for (const alert of alerts) {
    if (!alert.enabled) {
      continue;
    }

    let triggered = false;
    let mode = null;

    if (alert.type !== 'movement') {
      const offset = getOffset(alert);

      if (sensorData[alert.type] + offset > alert.max) {
        mode = 'over';
        triggered = true;
      }
      if (sensorData[alert.type] + offset < alert.min) {
        mode = 'under';
        triggered = true;
      }
    } else {
      if (parseInt(sensorData.movementCounter) !== parseInt(alert.counter)) {
        mode = 'different from';
        triggered = true;
      }
    }

    if (triggered) {
      // Throttling
      const throttleAlert = await throttleHelper.throttle(
                `alert:${alert.userId}:${sensorData.sensor_id}:${alert.type}`,
                throttleInterval
      );
      if (throttleAlert) {
        // For movement, we want to update the counters but not send an email when throttled
        if (alert.type === 'movement') {
          console.log(`Triggered movement while throttled for ${sensorData.sensor_id} with value ${sensorData.movementCounter} (in alert: ${alert.counter}). Skipping e-mail.`);
          await triggerAlert(alert, sensorData, mode, false, false);
        }
        continue;
      }

      await triggerAlert(alert, sensorData, mode);
    }

    // Trigger
    if (!triggered && alert.triggered) {
      await clearAlert(alert);
    }
  }
  await sqlHelper.disconnect();
};

/**
 * Exports
 */
module.exports = {
  getAlerts,
  refreshAlertCache,
  putAlert,
  triggerAlert,
  processAlerts,

  convertValue
};
