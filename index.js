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
const txHexDecoder = require("raw-transaction-hex-decoder");
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
    static uintArrayToBuffer(array) {
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
        const S = BIP47.uintArrayToBuffer(ecc.pointMultiply(B, a));
        const x = BIP47.uintArrayToBuffer(ecc.xOnlyPointFromPoint(S));
        const o = Buffer.from('86f411ab1c8e70ae8a0795ab7a6757aea6e4d5ae1826fc7b8f00c597d500609c01000000', 'hex');
        let _hmac = crypto.createHmac('sha512', o);
        let s = _hmac.update(x).digest();
        let binaryPaymentCode = this.getBinaryPaymentCode();
        binaryPaymentCode.fill((0, xor_1.xor)(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35);
        binaryPaymentCode.fill((0, xor_1.xor)(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67);
        return binaryPaymentCode.toString('hex');
    }
    getFirstExposedPubKeyAndOutpoint(tx) {
        const first = tx.ins[0];
        const hash = first.hash;
        const index = first.index;
        const indexHex = index.toString(16).padStart(8, '0');
        const outpoint = Buffer.from(hash.toString('hex') + indexHex, 'hex');
        let pubKey = null;
        if (first.witness.length)
            pubKey = first.witness[1];
        else if (bitcoin.script.toASM(first.script).split(' ').length == 2)
            pubKey = Buffer.from(bitcoin.script.toASM(first.script).split(' ')[1], 'hex');
        else
            throw "Unknown Transaction type";
        return {
            'outpoint': outpoint,
            'pubKey': pubKey
        };
    }
    getPaymentCodeFromRawNotificationTransaction(rawHexNotificationData) {
        let tx = bitcoin.Transaction.fromHex(rawHexNotificationData);
        let { pubKey, outpoint } = this.getFirstExposedPubKeyAndOutpoint(tx);
        let A = pubKey;
        let b = this.getNotificationNode().privateKey;
        let S = BIP47.uintArrayToBuffer(ecc.pointMultiply(A, b));
        let x = BIP47.uintArrayToBuffer(ecc.xOnlyPointFromPoint(S));
        let _hmac = crypto.createHmac('sha512', outpoint);
        let s = _hmac.update(x).digest();
        let opReturnOutput = tx.outs.find((o) => o.script.toString('hex').startsWith('6a4c50'));
        if (!opReturnOutput)
            throw "No OP_RETURN output in notification";
        let binaryPaymentCode = opReturnOutput.script.slice(3);
        binaryPaymentCode.fill((0, xor_1.xor)(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35);
        binaryPaymentCode.fill((0, xor_1.xor)(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67);
        return bs58check_ts_1.default.encode(Buffer.concat([Buffer.from([71]), binaryPaymentCode]));
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
let t = BIP47.fromBIP39Seed("sure plug leisure member give dress grain music embody able isolate curious", network_data_testnet);
// console.log(t.getNotificationNode().toWIF())
let testHex = "02000000024aac0078e3cccc900c35a10b5029e53084e9e762590e9d4aa8aa598210355310010000006a473044022030c7445ca81232ec5935f72827cd39b6e3b134d92be5853562bcc01f61e2bfde02205b45029d840fb6d1a912fcb9dd031bbaa305607dd066f0fcc8098b7253a3c0f3012103fdea480e61173609facb4a5b32f216b954e669adeacb1525da4dd4adfb7507f1fdffffff066d5d7e8a0a4482262fa14860e0d3dc8ef84b8ff1a09cd050185a8ec5ed9c77010000006a47304402204695ae58d86696d3372fac1937815da7f28a3c2e2a1ac28860034895ff28f74f02203d881ec0c72554fe72d2ad4fd959589bb2bb047e1dde9e8252a4933f629c9011012103fdea480e61173609facb4a5b32f216b954e669adeacb1525da4dd4adfb7507f1fdffffff01f0020000000000001976a914be908596e5ff768781a2f6842b5b1a56f94373ab88acf6082100";
let rawP2PKHNotification = "0200000001544fa314c2d62077ae08b73f67cfe3b1bbffb5d58c816e35b932d2836d6a3bd6000000006a47304402202ee0f1e056d212f6a162661fd69ca62508b9c1c3f8d39f2c072ffe9cb39ab20e0220618db06b730d708440530dd076cda511c6619e85c7477ad42ebd3b51a2a25cc6012103b93ea930391aab97f03490cfa7a52d219430a02792e2abc66fead006a6de049cffffffff040000000000000000536a4c500100038b526ece105975c73d6d7787e5d5cf25a7f79bdd6e13b4faf2e9d157b03b67de8db542a92e035670c01f2934cae01d95541eba1c5bb3ed81db3c9e89439daa810000000000000000000000000022020000000000001976a91465097af8412ccaa542421643a9a97300a4f91e8f88ac983a0000000000001600144411eaf4b9ce4367e1fa29c6c42f259eff94e43956480100000000001600144b47d20f600b0510bd4f62f6d4a80eb732d3f8cb00000000";
let rawP2WPKHNotification = "02000000000101e4cecfc286136cabb8c4a03baba7f549a20c748f065417da52722995c6e442d00000000000ffffffff040000000000000000536a4c50010003dbcc9c4d0932c85a86856fad2b45c190b40f1b265f8959544d08bd827b817cbf1db2c5c779fb9d2ad0c4796c001a95d1d7358713acdbbfd1826df8578a16ec900000000000000000000000000022020000000000001976a91465097af8412ccaa542421643a9a97300a4f91e8f88ac983a0000000000001600145761016026197c054f46e4a5f10e8fe923349e94f73d030000000000160014edc72cff2800d3c2a605cdcf0b45bb766e519bfb0247304402205d548a0042ac87a7a0102f46dc9491641cb34b22e9ef02020242972580dae56d022043ee0114beec3203ff2b303813d8e8174d3c69ecfdc6d093c54a186a84e90222012102d659fda36c83fb7fe09f4151ccd0e48531dfd26d998aeda3e6132c318db3006900000000";
console.assert(t.getPaymentCodeFromRawNotificationTransaction(rawP2WPKHNotification) == "PM8TJg84FwEUSVtr3junZgkugGakdqmN31xtoR1JHJAdWCgxRKmaNTQkrskVhjtCs8GSU8TpVetTrRqgXusT5whXMmxEWSqbWU8Mm9ufhn6Zqz3EFYxD", "Invalid payment code from notif");
console.assert(t.getPaymentCodeFromRawNotificationTransaction(rawP2PKHNotification) == "PM8TJacUrRpXNBC5HFS1MEUWctBr6EanRALajdW2aY17iA9i7XzuT22hcCm7ax4vaRYHYtAZBtJna3ijfxwBvvwEjjGuj8VWbJQT49XbxqLusbsAXT9j", "Invalid payment code from notif 2");
