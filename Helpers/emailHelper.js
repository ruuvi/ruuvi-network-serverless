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

const sendAlertEmail = async (email, sensorName, sensor, alertType, violationType, value, threshold, description) => {
    if (!sensorName) {
        sensorName = 'Unnamed sensor';
    }

    return await sendTemplatedEmail(email,
        'AlertTriggered',
        {
            'sensor': sensorName,
            'sensorMac': sensor,
            'type': alertType,
            'violation': violationType,
            'value': value,
            'threshold': threshold,
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
        sensorNameString = `sensor "${sensorName}"`;
    } else {
        sensorNameString = `a sensor`;
    }

    return await sendTemplatedEmail(email,
        'ShareNotification',
        {
            'sharer': sharerName,
            'sensor': sensorNameString
        }
    );
}

const sendShareRemovedNotification = async (email, sensorName, sharer) => {
    let sensorNameString = '';
    if (sensorName) {
        sensorNameString = `sensor "${sensorName}"`;
    } else {
        sensorNameString = `a sensor`;
    }

    return await sendTemplatedEmail(email,
        'UnshareNotification',
        {
            'sharer': sharerName,
            'sensor': sensorNameString
        }
    );
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
