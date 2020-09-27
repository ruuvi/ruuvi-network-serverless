/**
 * Creates a symmetric JWT for the given data.
 * 
 * @param payload Payload object (will be json encoded)
 * @param secret Secret to use for signing
 * @param ttl Time to live in seconds
 */
const sign = (payload, secret, ttl) => {
    const jwt = require('jsonwebtoken')
    
    const time = Math.floor(+new Date() / 1000);
    const token = jwt.sign({
        exp: time + ttl,
        iat: time,
        data: payload
    }, secret)

    return token
}

/**
 * Verifies a symmetric JWT token with a given secret
 * 
 * @param {string} token JWT Token
 * @param {secret} secret Secret to decrypt with
 */
const verify = (token, secret) => {
    const jwt = require('jsonwebtoken')

    try {
       const decrypted = jwt.verify(token, secret)

        const time = Math.floor(+new Date() / 1000)

        if (!decrypted.iat || decrypted.iat > time) {
            return false
        }

        if (!decrypted.exp || decrypted.exp < time) {
            return false
        }

        if (!decrypted.data) {
            return false
        }
    } catch (e) {
        return false
    }
    
    return decrypted.data
}

/**
 * Exports
 */
module.exports = {
   sign,
   verify
};