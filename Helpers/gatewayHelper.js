/**
 * Amazon API Gateway formatted response
 */
const response = (code, body, headers) => {
    // Resolve body to a string
    if (body !== null && typeof(body) !== "string") {
        body = JSON.stringify(body, null, 4); // 4 = pretty-print depth (TODO: Change to 0 eventually)
    } else if (body === null) {
        body = "";
    }

    // NOTE! This is probably too permissive unless we want to allow web-apps to embed the API.
    const corsHeaders = {
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
    };

    const completeHeaders = {
        ...headers,
        ...corsHeaders
    }

    return {
        'statusCode': code !== null ? code : 200,
        'headers': completeHeaders,
        'body': body
    };
};

/**
 * HTTP Codes Enumeration
 */
const HTTPCodes = {
    OK: 200,
    INVALID: 400,
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

const invalid = (headers, body) => response(HTTPCodes.INVALID, body, headers);
const forbidden = (headers, body) => response(HTTPCodes.FORBIDDEN, body, headers);
const notFound = (headers, body) => response(HTTPCodes.NOT_FOUND, body, headers);
const expired = (headers, body) => response(HTTPCodes.EXPIRED, body, headers);

const internal = (headers, body) => response(HTTPCodes.INVALID, body, headers);

/**
 * Helper method for logging errors on API calls.
 *
 * @param {int} code
 * @param {string} errorMessage
 * @param {object} errorData
 */
const logAPIError = (code, errorMessage, errorData) => {
    console.error(
        `API Error (${code}): ${errorMessage}` + (errorData !== null ? "\n" + JSON.stringify(errorData, null, 4) : "")
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
const errorResponse = (code, errorMessage, errorData, headers) => {
    logAPIError(code, errorMessage, errorData);

    if (code === HTTPCodes.OK) {
        throw new Error("Invalid error state: " + HTTPCodes.OK);
    }
    let errorObject = {
        result: "error",
        error: errorMessage
    };
    if (errorData) {
        errorObject.data = errorData;
    }
    return response(code, errorObject, headers);
};

/**
 * Standardized forbidden response with message.
 */
const forbiddenResponse = () => errorResponse(HTTPCodes.FORBIDDEN, "Forbidden.");

/**
 * Standardized forbidden response with message.
 */
const unauthorizedResponse = () => errorResponse(HTTPCodes.FORBIDDEN, "Unauthorized request.");

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
 * Exports
 */
module.exports = {
    response,

    ok,
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
    unauthorizedResponse
}

