"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmacSHA512 = void 0;
const createHmac = require('create-hmac');
function hmacSHA512(key, data) {
    return createHmac('sha512', key).update(data).digest();
}
exports.hmacSHA512 = hmacSHA512;
