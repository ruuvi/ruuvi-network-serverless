const sendEmailVerification = (email, token, ses) => {
    const link = `${process.env.BASE_API_URL}/verify?token=${token}`;
    var params = {
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Body: {
                Text: {
                    Data: `Please follow <a href="${link}">this link</a> to confirm your e-mail.`
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