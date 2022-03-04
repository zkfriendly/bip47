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
const crypto = __importStar(require("crypto"));
const xor_1 = require("./xor");
class BIP47 {
    static fromPaymentCode(paymentCode, network = network_data_mainnet) {
        let bip47 = new BIP47();
        bip47.network = network;
        bip47.masterPaymentCodeNode = BIP47.getPublicPaymentCodeNodeFromBase58(paymentCode, network);
        return bip47;
    }
    static fromBIP39Seed(bip39Seed, network = network_data_mainnet, password) {
        let bip47 = new BIP47();
        bip47.network = network;
        bip47.masterPaymentCodeNode = BIP47.getMasterPaymentCodeNodeFromBIP39Seed(bip39Seed, network, password);
        return bip47;
    }
    getWalletNodeForPaymentCodeAtIndex(bobMasterPublicPaymentCodeNode, index) {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
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
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
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
        return bs58check_ts_1.default.encode(Buffer.concat([Buffer.from([71]), this.getBinaryPaymentCode()]));
    }
    getBinaryPaymentCode() {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
        let node = this.masterPaymentCodeNode;
        let paymentCodeSerializedBuffer = Buffer.alloc(80);
        paymentCodeSerializedBuffer[0] = 0x01; // version
        paymentCodeSerializedBuffer[1] = 0x00; // must be zero
        paymentCodeSerializedBuffer[2] = node.publicKey[0]; // sign 2 or 3
        paymentCodeSerializedBuffer.fill(node.publicKey.slice(1), 3, 35); // pubkey
        paymentCodeSerializedBuffer.fill(node.chainCode, 35, 67); // chain code
        return paymentCodeSerializedBuffer;
    }
    getNotificationNode() {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
        return this.masterPaymentCodeNode.derive(0);
    }
    getNotificationNodeFromPaymentCode(paymentCode) {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
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
    getAddressFromNode(node, network = this.network) {
        return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: network === null || network === void 0 ? void 0 : network.network }).address;
    }
    uintArrayToBuffer(array) {
        const b = Buffer.alloc(array.length);
        for (let i = 0; i < array.length; i++)
            b[i] = array[i];
        return b;
    }
    getNotificationOut(bobBIP47) {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
        let bip = BIP47.bip32.fromPrivateKey(Buffer.from('1b7a10f45118e2519a8dd46ef81591c1ae501d082b6610fdda3de7a3c932880d', 'hex'), this.masterPaymentCodeNode.chainCode);
        const a = bip.privateKey;
        const B = bobBIP47.getNotificationNode().publicKey;
        const S = this.uintArrayToBuffer(ecc.pointMultiply(B, a));
        const x = this.uintArrayToBuffer(ecc.xOnlyPointFromPoint(S));
        const o = Buffer.from('86f411ab1c8e70ae8a0795ab7a6757aea6e4d5ae1826fc7b8f00c597d500609c01000000', 'hex');
        let _hmac = crypto.createHmac('sha512', o);
        let s = _hmac.update(x).digest();
        let binaryPaymentCode = this.getBinaryPaymentCode();
        binaryPaymentCode.fill((0, xor_1.xor)(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35);
        binaryPaymentCode.fill((0, xor_1.xor)(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67);
        console.log(binaryPaymentCode.toString('hex'));
        console.log("010002063e4eb95e62791b06c50e1a3a942e1ecaaa9afbbeb324d16ae6821e091611fa96c0cf048f607fe51a0327f5e2528979311c78cb2de0d682c61e1180fc3d543b00000000000000000000000000");
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
let bip39Seed = "response seminar brave tip suit recall often sound stick owner lottery motion";
let aliceBIP47 = BIP47.fromBIP39Seed(bip39Seed);
let bobBIP47 = BIP47.fromPaymentCode("PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97");
console.assert(aliceBIP47.getSerializedPaymentCode() == "PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA", "Payment Code Failed");
console.assert(aliceBIP47.getNotificationAddress() == "1JDdmqFLhpzcUwPeinhJbUPw4Co3aWLyzW", "Notification address mismatch");
console.assert(bobBIP47.getNotificationAddress() == "1ChvUUvht2hUQufHBXF8NgLhW8SwE2ecGV", "Bob notif address mismatch");
console.assert(bobBIP47.getNotificationNode().publicKey.toString('hex') == "024ce8e3b04ea205ff49f529950616c3db615b1e37753858cc60c1ce64d17e2ad8", "Bob notif pubkey mismatch");
aliceBIP47.getNotificationOut(bobBIP47);
