const { v4 } = require('uuid');
const gatewayHelper = require('../Helpers/gatewayHelper');
const { HTTPCodes } = require('../Helpers/gatewayHelper');
const auth = require('../Helpers/authHelper');
const validator = require('../Helpers/validator');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const mysql = require('serverless-mysql')({
    config: {
        host     : process.env.DATABASE_ENDPOINT,
        database : process.env.DATABASE_NAME,
        user     : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD
    }
});

/**
 * Gets a signed profile image upload URL
 *
 * @param {object} event
 * @param {object} context
 */
exports.handler = async (event, context) => {
    const user = await auth.authorizedUser(event.headers);
    if (!user) {
        return gatewayHelper.unauthorizedResponse();
    }

    const eventBody = JSON.parse(event.body);
    if (!eventBody || !validator.hasKeys(eventBody, ['type', 'sensor'])) {
        return gatewayHelper.errorResponse(gatewayHelper.HTTPCodes.INVALID, "Missing type or sensor");
    }

    const fileType = eventBody.type;
    const sensor = eventBody.sensor;

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

    const name = v4() + ext;

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

    try {
        results = await mysql.query({
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
            return gatewayHelper.errorResponse(HTTPCodes.NOT_FOUND, 'Sensor not owned or found.');
		}
        await mysql.end();
    } catch (e) {
		if (results.affectedRows === 1) {
            return gatewayHelper.errorResponse(HTTPCodes.INTERNAL, 'Error storing sensor metadata.');
		}
    }
    return gatewayHelper.successResponse({
        'uploadURL': uploadURL
    });
}
