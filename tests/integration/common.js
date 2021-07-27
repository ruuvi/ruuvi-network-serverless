/**
 * Runs a load test against the given end-point
 */
const querystring = require('querystring');
const axios = require('axios');
const utils = require('./integrationHelpers');

// Only run when condition is met; used for skipping tests
const itif = (condition) => condition ? it : it.skip;

// Load configuration
const stage = process.env.STAGE ? process.env.STAGE : 'dev';
const stageConfig = require('./integrationCredentials');

const baseURL = stageConfig[stage]['url'];
const primaryToken = stageConfig[stage]['primary'];
const secondaryToken = stageConfig[stage]['secondary'];
const primaryEmail = stageConfig[stage]['primaryEmail'];
const secondaryEmail = stageConfig[stage]['secondaryEmail'];
const unregisteredEmail = stageConfig[stage]['unregisteredEmail'];
const internalKey = stageConfig[stage]['internalKey'];

// Release test
const RI = process.env.IS_INTEGRATION_TEST;

/**
 * HTTP Client with Authorization set up
 */
const instance = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        Authorization: `Bearer ${primaryToken}`
    }
});

/**
 * HTTP Client with Authorization set up
 */
const secondaryHttp = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        Authorization: `Bearer ${secondaryToken}`
    }
});

/**
 * HTTP Client without signature
 */
const httpWithInvalidSignature = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        Authorization: `Bearer ${primaryToken}`,
        'Ruuvi-HMAC-SHA256': 'invalidsignature'
    }
});

/**
 * HTTP Client with Authorization set up
 */
 const internalHttp = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        'X-Internal-Secret': internalKey
    }
});

/**
 * Perform GET call to the back-end
 *
 * @param {string} endpoint
 * @param {object} queryParams
 */
const get = async (endpoint, queryParams, client = null) => {
     client = client ? client : instance;
     return await client.get('/' + endpoint + '?' + querystring.stringify(queryParams))
}

/**
 * Performs a POST call to the back-end
 *
 * @param {string} endpoint
 * @param {object} body
 */
const post = async (endpoint, body, client = null) => {
    client = client ? client : instance;
    return await client.post('/' + endpoint, body)
}

const sleep = async (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}   

module.exports = {
    utils,

    RI,

    itif,
    get,
    post,

    internalHttp,
    secondaryHttp,
    httpWithInvalidSignature,
    primaryEmail,
    secondaryEmail,
    unregisteredEmail,

    internalKey,

    sleep
}