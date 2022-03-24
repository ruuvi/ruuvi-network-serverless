const gatewayHelper = require('../Helpers/gatewayHelper');
const validator = require('../Helpers/validator');
const userHelper = require('../Helpers/userHelper');
const emailHelper = require('../Helpers/emailHelper');
const errorCodes = require('../Helpers/errorCodes');

const userWrapper = require('../Helpers/wrapper').userWrapper;

const getSensorName = async (sensor, userId, sqlHelper) => {
  const sensorProfiles = await sqlHelper.fetchMultiCondition(['sensor_id', 'user_id'], [sensor, userId], 'sensor_profiles');
  let sensorName = emailHelper.getDefaultSensorName(sensor);
  if (sensorProfiles !== null && sensorProfiles.length === 1 && sensorProfiles[0] !== null && sensorProfiles[0].name !== '') {
    sensorName = sensorProfiles[0].name;
  }
  return sensorName;
};

const getUserByEmail = async (email) => {
  const targetUser = null;
  const targetUserId = null;

  const ret = {
    targetUser: targetUser,
    targetUserId: targetUserId,
    targetUserEmail: email
  };

  if (!email) return ret;

  ret.targetUser = await userHelper.getByEmail(email);
  if (ret.targetUser) {
    ret.targetUserId = ret.targetUser.id;
  }

  return ret;
};

const executeUnshareSensor = async (event, context, sqlHelper, user) => {
  const eventBody = JSON.parse(event.body);

  if (!eventBody || !validator.hasKeys(eventBody, ['sensor'])) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Missing sensor or e-mail.', errorCodes.ER_MISSING_ARGUMENT);
  }

  const sensor = eventBody.sensor;
  let targetUserEmail = eventBody.user;

  // Required when owner of the sensor
  if (targetUserEmail && !validator.validateEmail(targetUserEmail)) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid E-mail given.', errorCodes.ER_INVALID_EMAIL_ADDRESS);
  }

  if (!validator.validateMacAddress(sensor)) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid sensor ID given.', errorCodes.ER_INVALID_MAC_ADDRESS);
  }

  // Fetch sensor for owner information
  const sensorData = await sqlHelper.fetchSingle('sensor_id', sensor, 'sensors');
  if (sensorData === null) {
    console.log('Error fetching sensor: ' + sensor);
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, 'Sensor not found.', errorCodes.ER_SENSOR_NOT_FOUND);
  }

  const ownerId = sensorData.owner_id;
  const isOwner = parseInt(ownerId) === parseInt(user.id);
  const owner = await sqlHelper.fetchSingle('id', ownerId, 'users');
  if (owner === null) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, 'Owner not found.', errorCodes.ER_USER_NOT_FOUND);
  }

  if (isOwner && !targetUserEmail) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'Invalid or no E-mail given.', errorCodes.ER_INVALID_EMAIL_ADDRESS);
  } else if (!isOwner && targetUserEmail && targetUserEmail !== user.email) {
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'You cannot unshare sensors you do not have access to.', errorCodes.ER_INVALID_EMAIL_ADDRESS);
  }

  targetUserEmail = isOwner ? targetUserEmail : user.email;

  // Fetch the user to unshare from
  const { targetUser, targetUserId } = await getUserByEmail(targetUserEmail);
  if (!targetUser) {
    console.error('User not found: ' + targetUserEmail + ' while unsharing ' + sensor);
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.NOT_FOUND, 'User not found.', errorCodes.ER_USER_NOT_FOUND);
  }

  let sensorName = null;
  if (isOwner) {
    sensorName = await getSensorName(sensor, targetUserId, sqlHelper);
  } else {
    sensorName = await getSensorName(sensor, ownerId, sqlHelper);
  }

  console.log(`User ${user.email} (${user.id}) attempting to remove ${sensor} from ${targetUserEmail} (${targetUserId})`);
  const wasRemoved = await sqlHelper.removeSensorProfileForUser(sensor, targetUserId);

  if (wasRemoved <= 0) {
    console.error(`User ${user.email} (${user.id}) tried to unshare a sensor ${sensor} but it was unsuccessful.`);
    return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, 'No access to sensor or sensor not shared.', errorCodes.ER_FORBIDDEN);
  }

  console.log(`User ${user.email} unshared sensor ${sensor} from ${targetUserEmail}`);
  if (isOwner) {
    console.log(`Sending Unshare notification to ${targetUserEmail} from user ${user.email} for sensor ${sensorName}`);
    await emailHelper.sendShareRemovedNotification(
      targetUserEmail,
      sensorName, // We probably want to fetch the localized sensor name for this
      user.email
    );
  } else {
    console.log(`Sending UnshareBySharee notification to ${owner.email} from user ${targetUserEmail} for sensor ${sensorName}`);
    await emailHelper.sendShareRemovedNotification(
      owner.email,
      sensorName,
      null,
      targetUserEmail,
      'UnshareByShareeNotification'
    );
  }

  return gatewayHelper.successResponse();
};

module.exports = {
  handler: async (event, context) => userWrapper(executeUnshareSensor, event, context),
  executeUnshareSensor: executeUnshareSensor
};
