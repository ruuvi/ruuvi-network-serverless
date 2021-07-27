const errorCodes = require('../Helpers/errorCodes.js');

/**
 * Amazon API Gateway formatted response
 */
const response = (code, body, headers, internalCode, internalSubCode) => {
    if (
        code !== HTTPCodes.OK
        && (
            internalCode === null
            || typeof errorCodes[internalCode] === 'undefined'
        )
    ) {
        // Currently not fail-worthy, but needs to be logged to screen new end-points
        console.warn(`Invalid internal error code: '${internalCode}' (with HTTP code: ${code})`);
    }

    if (code !== HTTPCodes.OK) {
        if (internalCode) {
            body.code = internalCode;
        }
        if (internalSubCode) {
            body.sub_code = internalSubCode;
        }
    }

    // Resolve body to a string
    let bodyString = "";
    if (body !== null) {
        // 4 = pretty-print depth (TODO: Change to 0 eventually)
        bodyString = typeof(body) === "string" ? body : JSON.stringify(body, null, 4);
    }

    // NOTE! This is probably too permissive unless we want to allow web-apps to embed the API.
    const corsHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers" : "*",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Max-Age": 86400
    };

    const completeHeaders = {
        ...headers,
        ...corsHeaders
    };

    // Construct response
    let val = {
        'statusCode': code !== null ? code : 200,
        'headers': completeHeaders,
        'body': bodyString
    };

    return val;
};

/**
 * HTTP Codes Enumeration
 */
const HTTPCodes = {
    OK: 200,
    INVALID: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    THROTTLED: 429,
    EXPIRED: 493,
    INTERNAL: 500
};

// Header names
const RequestRateHeader = 'x-ruuvi-gateway-rate';

// Helpers for shorter syntax
const ok = (body, headers) => response(HTTPCodes.OK, body, headers);

const invalid = (headers, body, internalCode, internalSubCode) => response(HTTPCodes.INVALID, body, headers, internalCode, internalSubCode);
const forbidden = (headers, body, internalCode, internalSubCode) => response(HTTPCodes.FORBIDDEN, body, headers, internalCode, internalSubCode);
const unauthorized = (headers, body, internalCode, internalSubCode) => response(HTTPCodes.UNAUTHORIZED, body, headers, internalCode, internalSubCode);
const notFound = (headers, body, internalCode, internalSubCode) => response(HTTPCodes.NOT_FOUND, body, headers, internalCode, internalSubCode);
const expired = (headers, body, internalCode, internalSubCode) => response(HTTPCodes.EXPIRED, body, headers, internalCode, internalSubCode);

const internal = (headers, body, internalCode, internalSubCode) => response(HTTPCodes.INVALID, body, headers, internalCode, internalSubCode);

/**
 * Helper method for logging errors on API calls.
 *
 * @param {int} code
 * @param {string} errorMessage
 * @param {object} errorData
 */
const logAPIError = (code, errorMessage, errorData, internalCode, internalSubCode) => {
    internalCode = internalCode ? internalCode : '';
    internalSubCode = internalSubCode ? internalSubCode : '';
    console.error(
        `API Error (${internalCode} ${internalSubCode} [${code}]): ${errorMessage}` + ((typeof errorData !== "undefined" && errorData !== null) ? "\n" + JSON.stringify(errorData, null, 4) : "")
    );
};

/**
 * Helper method for unified error formatting.
 *
 * @param {int} code
 * @param {string} errorMessage
 * @param {object} errorData
 * @param {object} headers
 */
const errorResponse = (code, errorMessage, internalCode, internalSubCode, errorData, headers) => {
    logAPIError(code, errorMessage, errorData, internalCode, internalSubCode);

    //if (code === HTTPCodes.OK) {
    //    throw new Error("Invalid error state: " + HTTPCodes.OK);
    //}
    let errorObject = {
        result: "error",
        error: errorMessage
    };
    if (errorData) {
        errorObject.data = errorData;
    }
    return response(code, errorObject, headers, internalCode, internalSubCode);
};

/**
 * Standardized forbidden response with message.
 */
const forbiddenResponse = () => errorResponse(HTTPCodes.FORBIDDEN, "Forbidden.", errorCodes.ER_FORBIDDEN);

/**
 * Standardized forbidden response with message.
 */
const unauthorizedResponse = () => errorResponse(HTTPCodes.FORBIDDEN, "Unauthorized request.", errorCodes.ER_UNAUTHORIZED);

const throttledResponse = () => errorResponse(HTTPCodes.THROTTLED, "Throttled.", errorCodes.ER_THROTTLED);

/**
 * Helper method for returning unified successes.
 *
 * @param {object} data
 * @param {object} headers
 */
const successResponse = (data, headers) => {
    let responseObject = {
        result: "success"
    };
    if (data) {
        responseObject.data = data;
    }
    return response(HTTPCodes.OK, responseObject, headers);
};

/**
 * Searches for a given header (case insensitive)
 *
 * @param {string} headerName Name of the header to look for
 * @param {array} headers Array of headers as provided by the API gateway
 */
const getHeader = (headerName, headers) => {
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === headerName.toLowerCase()) {
            return value
        }
    }
    return null
}

/**
 * Exports
 */
module.exports = {
    response,

    ok,
    unauthorized,
    forbidden,
    notFound,
    invalid,
    expired,
    internal,

    // Constants
    HTTPCodes,
    RequestRateHeader,

    // API level formatted errors
    successResponse,
    errorResponse,

    forbiddenResponse,
    unauthorizedResponse,
    throttledResponse,

    // Other
    getHeader
}

