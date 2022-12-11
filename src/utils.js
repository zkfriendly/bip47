"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const networks_1 = require("./networks");
const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const bs58check = require('bs58check');
function getUtils(ecc, bip32) {
    const getPublicPaymentCodeNodeFromBase58 = (paymentCode, network) => {
        const rawPaymentCode = bs58check.decode(paymentCode);
        return bip32.fromPublicKey(rawPaymentCode.slice(3, 36), rawPaymentCode.slice(36, 68), network.network);
    };
    const getRootPaymentCodeNodeFromSeedHex = (seedHex, network = networks_1.mainnetData) => {
        if (typeof seedHex === 'string')
            seedHex = Buffer.from(seedHex, 'hex');
        const node = bip32.fromSeed(seedHex, network.network);
        return node.derivePath(`m/47'/${network.coin}'/0'`);
    };
    const getRootPaymentCodeNodeFromBIP39Seed = (bip39Seed, network = networks_1.mainnetData, password) => {
        const seed = bip39.mnemonicToSeedSync(bip39Seed, password);
        return getRootPaymentCodeNodeFromSeedHex(seed);
    };
    const uintArrayToBuffer = (array) => {
        const b = Buffer.alloc(array.length);
        for (let i = 0; i < array.length; i++)
            b[i] = array[i];
        return b;
    };
    const getSharedSecret = (B, a) => {
        const S = uintArrayToBuffer(ecc.pointMultiply(B, a, true).slice(1, 33));
        let s = bitcoin.crypto.sha256(S);
        if (!ecc.isPrivate(s))
            throw new Error('Shared secret is not a valid private key');
        return s;
    };
    const toInternalByteOrder = (data) => {
        let start = 0;
        let length = data.length;
        while (length - start >= 1) {
            const tmp = data[start];
            const lastIndex = length - 1;
            data[start] = data[lastIndex];
            data[lastIndex] = tmp;
            length--;
            start++;
        }
        return data;
    };
    return {
        getPublicPaymentCodeNodeFromBase58,
        getRootPaymentCodeNodeFromSeedHex,
        getRootPaymentCodeNodeFromBIP39Seed,
        uintArrayToBuffer,
        getSharedSecret,
        toInternalByteOrder,
    };
}
exports.default = getUtils;
