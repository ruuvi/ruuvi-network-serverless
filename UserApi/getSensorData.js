const gatewayHelper = require('Helpers/gatewayHelper');
const dynamoHelper = require('Helpers/dynamoHelper');

exports.handler = async (event, context) => {
    // Authorization
    if (process.env.ACCESS_KEY !== "" && event.headers.authorization !== 'Bearer ' + process.env.ACCESS_KEY) {
        // Forbidden
        return gatewayHelper.forbidden();
    }
    
    // Validation
    if (
        !event.queryStringParameters.hasOwnProperty('tag')
        || event.queryStringParameters.tag === null
        || event.queryStringParameters.tag.length < 8) {

        // Invalid request
        return gatewayHelper.invalid();
    }

    const tag = event.queryStringParameters.tag;
    
    const dataPoints = await dynamoHelper.getSensorData(tag, process.env.DEFAULT_RESULTS);
    if (dataPoints.length === 0) {
        // Not found
        return gatewayHelper.notFound();
    }

    return gatewayHelper.successResponse({
        Tag: tag,
        Total: dataPoints.length,
        Measurements: dataPoints
    });
};
