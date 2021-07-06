const errorCodes = {
    // General errors
    ER_FORBIDDEN: 'ER_FORBIDDEN', // User authorized but access to resource denied
    ER_UNAUTHORIZED: 'ER_UNAUTHORIZED', // Authorization is required, but user is not authorized
    ER_INTERNAL: 'ER_INTERNAL', // Internal server error indicating an unexpect / unknown error
    ER_INVALID_FORMAT: 'ER_INVALID_FORMAT', // Invalid input format given for one or more input fields
    ER_USER_NOT_FOUND: 'ER_USER_NOT_FOUND', // Target user not found (f.ex. when sharing)
    ER_SENSOR_NOT_FOUND: 'ER_SENSOR_NOT_FOUND', // Sensor not found (or no access)
    ER_TOKEN_EXPIRED: 'ER_TOKEN_EXPIRED', // Access token expired (f.ex. User verification tokens)
    ER_THROTTLED: 'ER_THROTTLED', // Throttled request due to too high call frequency

    // Subscriptions and Sharing
    ER_SUBSCRIPTION_NOT_FOUND: 'ER_SUBSCRIPTION_NOT_FOUND', // Thrown when action requires a subscription but it is not found
    ER_SHARE_COUNT_REACHED: 'ER_SHARE_COUNT_REACHED', // Maximum share count for the user reached
    ER_CLAIM_COUNT_REACHED: 'ER_CLAIM_COUNT_REACHED', // Maximum claim count for the user reached
    ER_SENSOR_SHARE_COUNT_REACHED: 'ER_SENSOR_SHARE_COUNT_REACHED', // Maximum share count for the sensor reached
    ER_NO_DATA_TO_SHARE: 'ER_NO_DATA_TO_SHARE', // In order to share a sensor, it must have data - thrown when condition is not met
    ER_SENSOR_ALREADY_SHARED: 'ER_SENSOR_ALREADY_SHARED', // The sensor has already been shared to target user
    ER_SENSOR_ALREADY_SHARED: 'ER_SENSOR_ALREADY_CLAIMED', // The sensor has already been claimed
    ER_UNABLE_TO_SEND_EMAIL: 'ER_UNABLE_TO_SEND_EMAIL', // Error sending an e-mail notification / verification

    // Argument errors
    ER_MISSING_ARGUMENT: 'ER_MISSING_ARGUMENT', // Missing a required argument from API end-point
    ER_INVALID_DENSITY_MODE: 'ER_INVALID_DENSITY_MODE', // Density mode must be one of ['dense', 'sparse', 'mixed']
    ER_INVALID_SORT_MODE: 'ER_INVALID_SORT_MODE', // Sort fetched data ascending on descending based on timestamp. Must be one of ['asc', 'desc']
    ER_INVALID_TIME_RANGE: 'ER_INVALID_TIME_RANGE', // Invalid time range given - most often since timestamp after until timestamp
    ER_INVALID_EMAIL_ADDRESS: 'ER_INVALID_EMAIL_ADDRESS', // Invalid e-mail format in given argument
    ER_INVALID_MAC_ADDRESS: 'ER_INVALID_MAC_ADDRESS', // Invalid MAC addrss format in given argument
    ER_INVALID_ENUM_VALUE: 'ER_INVALID_ENUM_VALUE', // Invalid ENUM value given

    // Sub-codes
    ER_SUB_DATA_STORAGE_ERROR: 'ER_SUB_DATA_STORAGE_ERROR', // Internal sub-code when database write / read failed unexpectedly.
    ER_SUB_NO_USER: 'ER_SUB_NO_USER' // Returned when no user could be found or created via e-mail verification flow
};

/**
 * Exports
 */
module.exports = errorCodes;
