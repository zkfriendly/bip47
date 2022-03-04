"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xor = void 0;
// From https://github.com/czzarr/node-bitwise-xor/blob/master/index.js
function xor(a, b) {
    let res = [];
    if (a.length > b.length) {
        for (let i = 0; i < b.length; i++) {
            res.push(a[i] ^ b[i]);
        }
    }
    else {
        for (let i = 0; i < a.length; i++) {
            res.push(a[i] ^ b[i]);
        }
    }
    return Buffer.from(res);
}
exports.xor = xor;
