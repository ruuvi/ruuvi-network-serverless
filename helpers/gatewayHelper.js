/**
 * Amazon API Gateway formatted response
 */
module.exports.response = (code, headers, body) => {
    return {
        'statusCode': code !== null ? code : 200,
        'headers': headers !== null ? headers : { },
        'body': body !== null ? body : ""
    };
};
