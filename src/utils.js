"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharedSecret = exports.uintArrayToBuffer = exports.getRootPaymentCodeNodeFromBIP39Seed = exports.getRootPaymentCodeNodeFromSeedHex = exports.getPublicPaymentCodeNodeFromBase58 = void 0;
const bip32_1 = require("bip32");
const bs58check_ts_1 = require("bs58check-ts");
const networks_1 = require("./networks");
const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const getPublicPaymentCodeNodeFromBase58 = (ecc, paymentCode, network) => {
    const rawPaymentCode = bs58check_ts_1.default.decode(paymentCode);
    const bip32 = (0, bip32_1.default)(ecc);
    return bip32.fromPublicKey(rawPaymentCode.slice(3, 36), rawPaymentCode.slice(36, 68), network.network);
};
exports.getPublicPaymentCodeNodeFromBase58 = getPublicPaymentCodeNodeFromBase58;
const getRootPaymentCodeNodeFromSeedHex = (ecc, seedHex, network = networks_1.mainnetData) => {
    if (typeof seedHex === 'string')
        seedHex = Buffer.from(seedHex, 'hex');
    const bip32 = (0, bip32_1.default)(ecc);
    const node = bip32.fromSeed(seedHex, network.network);
    return node.derivePath(`m/47'/${network.coin}'/0'`);
};
exports.getRootPaymentCodeNodeFromSeedHex = getRootPaymentCodeNodeFromSeedHex;
const getRootPaymentCodeNodeFromBIP39Seed = (ecc, bip39Seed, network = networks_1.mainnetData, password) => {
    const seed = bip39.mnemonicToSeedSync(bip39Seed, password);
    return (0, exports.getRootPaymentCodeNodeFromSeedHex)(ecc, seed);
};
exports.getRootPaymentCodeNodeFromBIP39Seed = getRootPaymentCodeNodeFromBIP39Seed;
const uintArrayToBuffer = (array) => {
    const b = Buffer.alloc(array.length);
    for (let i = 0; i < array.length; i++)
        b[i] = array[i];
    return b;
};
exports.uintArrayToBuffer = uintArrayToBuffer;
const getSharedSecret = (ecc, B, a) => {
    const SUint = ecc.xOnlyPointFromPoint(ecc.pointMultiply(B, a, true));
    const S = Buffer.alloc(32);
    for (let i = 0; i < S.length; i++)
        S[i] = SUint[i]; // uint8Array to Buffer
    return bitcoin.crypto.sha256(S);
};
exports.getSharedSecret = getSharedSecret;
