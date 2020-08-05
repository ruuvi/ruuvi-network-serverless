/**
 * Amazon API Gateway formatted response
 */
const response = (code, headers, body) => {
    return {
        'statusCode': code !== null ? code : 200,
        'headers': headers !== null ? headers : { },
        'body': body !== null ? body : ""
    };
};

// Helpers for shorter syntax
const ok = (headers, body) => response(200, headers, body);

const invalid = (headers, body) => response(400, headers, body);
const forbidden = (headers, body) => response(403, headers, body);
const notFound = (headers, body) => response(403, headers, body);
const expired = (headers, body) => response(493, headers, body);

const internal = (headers, body) => response(500, headers, body);

/**
 * Exports
 */
module.exports = {
    response,

    ok,
    forbidden,
    notFound,
    invalid,
    expired,
    internal
}

