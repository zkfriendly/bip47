const createHmac = require('create-hmac');

export function hmacSHA512(key: Buffer, data: Buffer): Buffer {
  return createHmac('sha512', key).update(data).digest();
}
