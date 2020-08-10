const sendEmailVerification = (email, token, ses) => {
    var params = {
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Body: {
                Text: {
                    Data: "Please go to " + token
                }
                
            },
            
            Subject: {
                Data: "Ruuvi Account E-mail Confirmation"
            }
        },
        Source: "sami@muhwu.com"
    };
    return await ses.sendEmail(params);
};

module.exports = {
    sendEmailVerification
};