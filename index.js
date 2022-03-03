"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bip39 = __importStar(require("bip39"));
const bip32_1 = __importDefault(require("bip32"));
const ecc = __importStar(require("tiny-secp256k1"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bs58check_ts_1 = __importDefault(require("bs58check-ts"));
function bufferToHexString(buffer) {
    if (buffer !== undefined)
        return [...buffer].map((b) => Number(b).toString(16)).join('');
    return "";
}
function getAddress(node, network) {
    return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address;
}
// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = (0, bip32_1.default)(ecc);
let sampleSeed = "submit enough hand diagram close local rhythm goose path fade almost quick";
let seed = bip39.mnemonicToSeedSync(sampleSeed);
let node = bip32.fromSeed(seed);
let paymentCodeNode = node.derivePath("m/47'/0'/0'");
let BIP47NotificationNode = paymentCodeNode.derive(0);
console.log(getAddress(BIP47NotificationNode));
// payment code serialize
let paymentCodeSerializedBuffer = Buffer.alloc(81);
paymentCodeSerializedBuffer[0] = 71;
paymentCodeSerializedBuffer[1] = 0x01; // version
paymentCodeSerializedBuffer[2] = 0x00; // must be zero
paymentCodeSerializedBuffer[3] = 0x03; // sign 2 or 3
paymentCodeSerializedBuffer.fill(paymentCodeNode.publicKey.slice(1), 4, 36); // pubkey
paymentCodeSerializedBuffer.fill(paymentCodeNode.chainCode, 36, 68); // chain code
const payment = bs58check_ts_1.default.encode(paymentCodeSerializedBuffer);
const actual = "PM8TJZ1Bzg526N1i3QLYvoohMfdrax9kRZiyncDmN4ZAMTdeenX3ETa2WHMDpEGtzq7eKaiWC4DHsQYR6fsiFYBPNhCDWmMKZpqkfQgnJPVvLRBpgYn9";
console.log(payment);
console.log(actual);
console.log(payment == actual);
// extended private and public key are required
// Each extended key has 2^31 normal child keys, and 2^31 hardened child keys. 
// Each of these child keys has an index. The normal child keys use indices 0 through 2^(31)-1. 
// The hardened child keys use indices 2^31 through 2^(32)-1
