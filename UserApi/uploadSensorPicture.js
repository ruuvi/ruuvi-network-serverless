const { v4 } = require('uuid');
const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const errorCodes = require('../Helpers/errorCodes');

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const wrapper = require('../Helpers/wrapper').wrapper;

exports.handler = async (event, context) => wrapper(executeUploadSensorPicture, event, context);

/**
 * Gets a signed profile image upload URL
 *
 * @param {object} event
 * @param {object} context
 */
const executeUploadSensorPicture = async (event, context, sqlHelper) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);
    if (!eventBody) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing type, action or sensor", errorCodes.ER_MISSING_ARGUMENT);
    }
    
    if (!validator.hasKeys(eventBody, ['sensor'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing sensor", errorCodes.ER_MISSING_ARGUMENT);
    }
    const sensor = eventBody.sensor;

    // Default to upload
    const action = validator.hasKeys(eventBody, ['action']) ? eventBody.action : 'upload';
    if (action === 'reset') {
        try {
            results = await sqlHelper.query({
                sql: `UPDATE sensor_profiles
                        SET
                        picture = '',
                        updated_at = CURRENT_TIMESTAMP
                        WHERE
                        sensor_id = ?
                        AND user_id = ?
                        AND is_active = 1`,
                timeout: 1000,
                values: [sensor, user.id]
            });
            if (results.affectedRows !== 1) {
                return gatewayHelper.errorResponse(HTTPCodes.NOT_FOUND, 'Sensor not owned or found.', errorCodes.ER_SENSOR_NOT_FOUND);
            }
        } catch (e) {
            if (results.affectedRows && results.affectedRows === 1) {
                return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, 'Error closing connection.', errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
            }
            return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, 'Error storing sensor metadata.', errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
        } finally {
            return gatewayHelper.successResponse({
                'uploadURL': '',
                'guid': ''
            });
        }
    } else if (!validator.hasKeys(eventBody, ['type'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing type", errorCodes.ER_MISSING_ARGUMENT);
    }

    const fileType = eventBody.type;

    // Generate filename
    let ext = '';
    switch (fileType) {
        case 'image/png':
            ext = '.png';
            break;
        case 'image/gif':
            ext = '.gif';
            break;
        case 'image/jpeg':
            ext = '.jpg';
            break;
        default:
            return gatewayHelper.errorResponse(
                gatewayHelper.HTTPCodes.INVALID,
                "Unsupported type: " + fileType
            );
    }
    const pictureGuid = v4();
    const name = pictureGuid + ext;

    var s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: name,
        ContentType: fileType,
        ACL: 'public-read',
    };

    // Signed S3 upload URL
    const uploadURL = s3.getSignedUrl('putObject', s3Params);

    // URL as it will be after upload
    const finalURL = process.env.BUCKET_URL + '/' + name;

    let results = null;

    try {
        results = await sqlHelper.query({
            sql: `UPDATE sensor_profiles
                  SET
                    picture = ?,
                    updated_at = CURRENT_TIMESTAMP
                  WHERE
                    sensor_id = ?
                    AND user_id = ?
                    AND is_active = 1`,
            timeout: 1000,
            values: [finalURL, sensor, user.id]
        });
		if (results.affectedRows !== 1) {
            return gatewayHelper.errorResponse(HTTPCodes.NOT_FOUND, 'Sensor not owned or found.', errorCodes.ER_SENSOR_NOT_FOUND);
		}
    } catch (e) {
		if (results.affectedRows && results.affectedRows === 1) {
            return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, 'Error closing connection.', errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
        }
        return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, 'Error storing sensor metadata.', errorCodes.ER_INTERNAL, errorCodes.ER_SUB_DATA_STORAGE_ERROR);
    }

    return gatewayHelper.successResponse({
        'uploadURL': uploadURL,
        'guid': pictureGuid
    });
}
