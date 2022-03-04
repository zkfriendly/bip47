// From https://github.com/czzarr/node-bitwise-xor/blob/master/index.js
export function xor(a: Buffer, b: Buffer) {
    let res = []
    if (a.length > b.length) {
        for (let i = 0; i < b.length; i++) {
            res.push(a[i] ^ b[i])
        }
    } else {
        for (let i = 0; i < a.length; i++) {
            res.push(a[i] ^ b[i])
        }
    }
    return Buffer.from(res);
}