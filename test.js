const jwtHelper = require ('./Helpers/JWTHelper.js')
const secret = "pupe";

const token = jwtHelper.sign({test: 'data', kek: 'lol'}, secret, 1)
console.log(token)

setTimeout(() => {
    const decrypted = jwtHelper.verify(token, secret)
    console.log(decrypted)
}, 2000)
