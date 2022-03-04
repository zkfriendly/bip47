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
class BIP47 {
    constructor(bip39Seed, network, password) {
        this.network = network;
        this.masterPaymentCodeNode = BIP47.getMasterPaymentCodeNodeFromBIP39Seed(bip39Seed, this.network, password);
    }
    getWalletNodeForPaymentCodeAtIndex(bobMasterPublicPaymentCodeNode, index) {
        const alicePrivateNode = this.masterPaymentCodeNode.derive(index);
        const zerothBobPaymentNode = bobMasterPublicPaymentCodeNode.derive(0);
        const s = BIP47.getSharedSecret(zerothBobPaymentNode.publicKey, alicePrivateNode.privateKey);
        if (!ecc.isPrivate(s))
            throw new TypeError('Invalid shared secret');
        const prvKeyUint = ecc.privateAdd(alicePrivateNode.privateKey, s);
        const prvKey = Buffer.alloc(32);
        for (let i = 0; i < prvKey.length; i++)
            prvKey[i] = prvKeyUint[i];
        return BIP47.bip32.fromPrivateKey(prvKey, zerothBobPaymentNode.chainCode, this.network.network);
    }
    getPaymentAddressForPaymentCodeNodeAtIndex(bobMasterPublicPaymentCodeNode, index) {
        const zerothAlicePaymentCodeNode = this.masterPaymentCodeNode.derive(0);
        const currentBobPublicPaymentCodeNode = bobMasterPublicPaymentCodeNode.derive(index);
        const a = zerothAlicePaymentCodeNode.privateKey;
        const B = currentBobPublicPaymentCodeNode.publicKey;
        const s = BIP47.getSharedSecret(B, a);
        const sG = ecc.pointMultiply(BIP47.G, s, true);
        const BPrime = ecc.pointAdd(B, sG, true);
        const BPrimeBuffer = Buffer.alloc(33);
        for (let i = 0; i < BPrimeBuffer.length; i++)
            BPrimeBuffer[i] = BPrime[i];
        let node = BIP47.bip32.fromPublicKey(BPrimeBuffer, currentBobPublicPaymentCodeNode.chainCode, this.network.network);
        return this.getAddressFromNode(node);
    }
    static getSharedSecret(B, a) {
        const SUint = ecc.xOnlyPointFromPoint(ecc.pointMultiply(B, a, true));
        const S = Buffer.alloc(32);
        for (let i = 0; i < S.length; i++)
            S[i] = SUint[i]; // uint8Array to Buffer
        return bitcoin.crypto.sha256(S);
    }
    getSerializedPaymentCode() {
        let node = this.masterPaymentCodeNode;
        let paymentCodeSerializedBuffer = Buffer.alloc(81);
        paymentCodeSerializedBuffer[0] = 71;
        paymentCodeSerializedBuffer[1] = 0x01; // version
        paymentCodeSerializedBuffer[2] = 0x00; // must be zero
        paymentCodeSerializedBuffer[3] = node.publicKey[0]; // sign 2 or 3
        paymentCodeSerializedBuffer.fill(node.publicKey.slice(1), 4, 36); // pubkey
        paymentCodeSerializedBuffer.fill(node.chainCode, 36, 68); // chain code
        return bs58check_ts_1.default.encode(paymentCodeSerializedBuffer);
    }
    getNotificationNode() {
        return this.masterPaymentCodeNode.derive(0);
    }
    getNotificationNodeFromPaymentCode(paymentCode) {
        return BIP47.getPublicPaymentCodeNodeFromBase58(paymentCode, this.network);
    }
    getNotificationAddressFromPaymentCode(paymentCode) {
        return this.getAddressFromNode(this.getNotificationNodeFromPaymentCode(paymentCode));
    }
    getNotificationAddress() {
        return this.getAddressFromNode(this.getNotificationNode());
    }
    static getPublicPaymentCodeNodeFromBase58(paymentCode, network) {
        let rawPaymentCode = bs58check_ts_1.default.decode(paymentCode);
        return BIP47.bip32.fromPublicKey(rawPaymentCode.slice(3, 36), rawPaymentCode.slice(36, 68), network.network);
    }
    static getMasterPaymentCodeNodeFromBIP39Seed(bip39Seed, network, password) {
        let seed = bip39.mnemonicToSeedSync(bip39Seed, password);
        let node = BIP47.bip32.fromSeed(seed, network.network);
        return node.derivePath(`m/47'/${network.coin}'/0'`);
    }
    static UintArrayToHexString(buffer) {
        if (buffer !== undefined)
            return [...buffer].map((b) => Number(b).toString(16)).join('');
        return "";
    }
    getAddressFromNode(node) {
        return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: this.network.network }).address;
    }
}
BIP47.G = Buffer.from("0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 'hex');
BIP47.bip32 = (0, bip32_1.default)(ecc);
let network_data_testnet = {
    'network': bitcoin.networks.testnet,
    'coin': "1"
};
let network_data_mainnet = {
    'network': bitcoin.networks.bitcoin,
    'coin': "0"
};
let bip39Seed = "submit enough hand diagram close local rhythm goose path fade almost quick";
let bip47wallet = new BIP47(bip39Seed, network_data_testnet);
let bobNode = BIP47.getPublicPaymentCodeNodeFromBase58("PM8TJaz19chXNgWBbuFyFJQqjTAMpAffgGkAXZZsSCkxVCSBJtqju3v26BSU98WkmhurgoBTyJfhckPzBGnjaXoCkjzg7u6gaAq8nbDUTbhFnuYNMLhf", network_data_testnet);
console.log("My Notification Address ", bip47wallet.getNotificationAddress());
console.log(bip47wallet.getPaymentAddressForPaymentCodeNodeAtIndex(bobNode, 0));
