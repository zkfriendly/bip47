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
const G = Buffer.from("0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 'hex');
function bufferToHexString(buffer) {
    if (buffer !== undefined)
        return [...buffer].map((b) => Number(b).toString(16)).join('');
    return "";
}
function getAddress(node, network) {
    return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address;
}
let network_data_testnet = {
    'network': bitcoin.networks.testnet,
    'coin': "1"
};
let network_data_mainnet = {
    'network': bitcoin.networks.bitcoin,
    'coin': "0"
};
// choose network
let network = network_data_testnet;
// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = (0, bip32_1.default)(ecc);
let bip39Seed = "submit enough hand diagram close local rhythm goose path fade almost quick";
// seed from bip39 seed phrase
let seed = bip39.mnemonicToSeedSync(bip39Seed);
let node = bip32.fromSeed(seed, network.network);
// payment code node from master node
let paymentCodeNode = node.derivePath(`m/47'/${network.coin}'/0'`);
// notification node from payment code node
let BIP47NotificationNode = paymentCodeNode.derive(0);
// payment code serialize
let paymentCodeSerializedBuffer = Buffer.alloc(81);
paymentCodeSerializedBuffer[0] = 71;
paymentCodeSerializedBuffer[1] = 0x01; // version
paymentCodeSerializedBuffer[2] = 0x00; // must be zero
paymentCodeSerializedBuffer[3] = paymentCodeNode.publicKey[0]; // sign 2 or 3
paymentCodeSerializedBuffer.fill(paymentCodeNode.publicKey.slice(1), 4, 36); // pubkey
paymentCodeSerializedBuffer.fill(paymentCodeNode.chainCode, 36, 68); // chain code
const paymentCodeSerialized = bs58check_ts_1.default.encode(paymentCodeSerializedBuffer);
function getAliceToBobPaymentAddressAt(aliceMasterPrivatePaymentCodeNode, bobMasterPublicPaymentCodeNode, index) {
    const zerothAlicePaymentCodeNode = aliceMasterPrivatePaymentCodeNode.derive(0);
    const currentBobPublicPaymentCodeNode = bobMasterPublicPaymentCodeNode.derive(index);
    const a = zerothAlicePaymentCodeNode.privateKey;
    const B = currentBobPublicPaymentCodeNode.publicKey;
    const SUint = ecc.xOnlyPointFromPoint(ecc.pointMultiply(B, a, true));
    const S = Buffer.alloc(32);
    for (let i = 0; i < S.length; i++)
        S[i] = SUint[i]; // uint8Array to Buffer
    const s = bitcoin.crypto.sha256(S);
    const sG = ecc.pointMultiply(G, s, true);
    const BPrime = ecc.pointAdd(B, sG, true);
    const BPrimeBuffer = Buffer.alloc(33);
    for (let i = 0; i < BPrimeBuffer.length; i++)
        BPrimeBuffer[i] = BPrime[i];
    return BPrimeBuffer;
}
// function getReceiveAddressAtIndex(index: number): Buffer {
//     const bobPaymentCodeBuffer: Buffer = base58check.decode("PM8TJaz19chXNgWBbuFyFJQqjTAMpAffgGkAXZZsSCkxVCSBJtqju3v26BSU98WkmhurgoBTyJfhckPzBGnjaXoCkjzg7u6gaAq8nbDUTbhFnuYNMLhf");
//     const bobPaymentCodeNode: BIP32Interface = bip32.fromPublicKey(bobPaymentCodeBuffer.slice(3, 36), bobPaymentCodeBuffer.slice(36, 68));
//
//     const bob0PublicNode: BIP32Interface = bobPaymentCodeNode.derive(0);
//     const alicePrivateNode: BIP32Interface = paymentCodeNode.derive(index);
//
// }
// generate sending addresses
for (let index = 0; index < 10; index++) {
    const bobPaymentCodeBuffer = bs58check_ts_1.default.decode("PM8TJaz19chXNgWBbuFyFJQqjTAMpAffgGkAXZZsSCkxVCSBJtqju3v26BSU98WkmhurgoBTyJfhckPzBGnjaXoCkjzg7u6gaAq8nbDUTbhFnuYNMLhf");
    const bobPublicKeyNode = bip32.fromPublicKey(bobPaymentCodeBuffer.slice(3, 36), bobPaymentCodeBuffer.slice(36, 68));
    let BPrimeBuffer = getAliceToBobPaymentAddressAt(paymentCodeNode, bobPublicKeyNode, index);
    console.log(bitcoin.payments.p2pkh({ pubkey: BPrimeBuffer, network: network.network }).address);
}
