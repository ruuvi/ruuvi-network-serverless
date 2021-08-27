var AWS = require('aws-sdk');
AWS.config.update({region: 'eu-central-1'});

var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

/**
 * Queues the email for the service.
 * 
 * @param {string} email target email
 * @param {string} title email title
 * @param {string} body email body
 * @returns 
 */
 const sendTemplatedEmail = async (email, template, templateData) => {
    if (!process.env.EMAIL_QUEUE) {
        console.error("EMAIL_QUEUE variable not set!");
        return null;
    }

    const params = {
        MessageAttributes: {
            "TargetEmail": {
                DataType: "String",
                StringValue: email
            },
            "Template": {
                DataType: "String",
                StringValue: template
            }
        },
        MessageBody: JSON.stringify(templateData),

        QueueUrl: process.env.EMAIL_QUEUE,
        DelaySeconds: 1
    };

    return sqs.sendMessage(params).promise();
};

/**
 * Get the domain if given, otherwise return default.
 * 
 * @param {*} sourceDomain Domain, if any - will return base otherwise
 * @returns 
 */
const getDomain = (sourceDomain = null) => {
    let domain = process.env.BASE_API_URL;
    if (sourceDomain) {
        domain = sourceDomain;
    }
    return domain;
}

/**
 * Sends account verification to the target email
 * 
 * @param {*} email 
 * @param {*} token 
 * @param {*} sourceDomain 
 * @returns 
 */
const sendEmailVerification = async (email, token, sourceDomain = null) => {
    const domain = getDomain(sourceDomain);
    const link = `${domain}/verify?token=${token}`;

    return await sendTemplatedEmail(email,
        'AccountVerification',
        {
            'token': token,
            'link': link
        }
    );
}

/**
 * Sends account invitation to the target email
 * 
 * @param {*} email 
 * @param {*} token 
 * @param {*} sourceDomain 
 * @returns 
 */
 const sendEmailInvitation = async (email, fromEmail, sensorName, sourceDomain = null) => {
    return await sendTemplatedEmail(email,
        'AccountInvite',
        {
            'from': fromEmail,
            'sensor': sensorName
        }
    );
}

/**
 * Reset credentials email
 * 
 * @param {*} email 
 * @param {*} token 
 * @param {*} sourceDomain 
 * @returns 
 */
const sendResetEmail = async (email, token, sourceDomain) => {
    const domain = getDomain(sourceDomain);
    const link = `${domain}/verify?token=${token}`;

    return await sendTemplatedEmail(email,
        'ResetCredentials',
        {
            'token': token,
            'link': link
        }
    );
}

/**
 * Accurately rounds to two decimals.
 * 
 * @param {*} number 
 * @returns
 */
const accurateRound = (number) => {
    return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Send alert email
 * 
 * @param {*} email 
 * @param {*} sensorName 
 * @param {*} sensor 
 * @param {*} alertType 
 * @param {*} violationType 
 * @param {*} value 
 * @param {*} threshold 
 * @param {*} description 
 * @returns 
 */
const sendAlertEmail = async (
    email,
    sensorName,
    sensor,
    alertType,
    violationType,
    value,
    threshold,
    alertUnit,
    description
) => {

    if (!sensorName) {
        sensorName = 'Unnamed sensor';
    }
    if (!description) {
        description = "";
    }

    if (!email || !sensor || !alertType || !violationType || !value || !threshold || !alertUnit) {
        console.error('Missing argument for email:', {
            email: email,
            sensorName: sensorName,
            sensor: sensor,
            alertType: alertType,
            violationType: violationType,
            value: accurateRound(value),
            threshold: accurateRound(threshold),
            unit: alertUnit,
            description: description
        });
        throw new Error("Invalid input for sendAlertEmail");
    }

    return await sendTemplatedEmail(email,
        'AlertTriggered',
        {
            'sensor': sensorName,
            'sensorMac': sensor,
            'type': alertType,
            'violation': violationType,
            'value': accurateRound(value),
            'threshold': accurateRound(threshold),
            'unit': alertUnit,
            'description': description
        }
    );
}

/**
 * Sends account verification to the target email
 * 
 * @param {*} email 
 * @param {*} token 
 * @param {*} sourceDomain 
 * @returns 
 */
 const sendShareNotification = async (email, sensorName, sharerName) => {
    let sensorNameString = '';
    if (sensorName) {
        sensorNameString = `${sensorName}`;
    } else {
        sensorNameString = `unnamed`;
    }

    return await sendTemplatedEmail(email,
        'ShareNotification',
        {
            'sharer': sharerName,
            'sensor': sensorNameString
        }
    );
}

/**
 * Send notification of a share being removed.
 * 
 * @param {*} email 
 * @param {*} sensorName 
 * @param {*} sharerName 
 * @param {*} shareeName
 * @param {*} template
 * @returns 
 */
const sendShareRemovedNotification = async (email, sensorName, sharerName, shareeName = null, template = null) => {
    if (template === null || template === '') {
        template = 'UnshareNotification';
    }

    let data = {
        'sensor': sensorName ? `${sensorName}` : 'unnamed'
    }

    if (sharerName !== null) {
        data.sharerName = sharerName;
    }
    if (shareeName !== null) {
        data.shareeName = shareeName;
    }

    return await sendTemplatedEmail(email, template, data);
}

/**
 * Masks an e-mail to format "x****.****y@z****w.com"
 * 
 * @param {string} email 
 * @returns 
 */
const maskEmail = (email) => {
    function mask(str) {
        var strLen = str.length;
        if (strLen > 4) {
            return str.substr(0, 1) + str.substr(1, strLen - 2).replace(/\w/g, '*') + str.substr(-1,1);
        } 
        return str.replace(/\w/g, '*');
    }
    return email.replace(/([\w.]+)@([\w.]+)(\.[\w.]+)/g, function (m, p1, p2, p3) {      
        return mask(p1) + '@' + mask(p2) + p3;
    });
}

module.exports = {
    sendEmailVerification,
    sendResetEmail,
    sendShareNotification,
    sendShareRemovedNotification,
    sendAlertEmail,
    sendEmailInvitation,
    maskEmail
};
