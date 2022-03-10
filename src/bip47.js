"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIP47Factory = void 0;
const bip32_1 = require("bip32");
const bitcoin = require("bitcoinjs-lib");
const bs58check_ts_1 = require("bs58check-ts");
const crypto = require("./crypto");
const xor_1 = require("./xor");
const networks_1 = require("./networks");
const utils_1 = require("./utils");
function BIP47Factory(ecc) {
    // TODO: implement a test assertion function for ecc
    class BIP47 {
        constructor(network, RootPaymentCodeNode) {
            this.network = network;
            this.RootPaymentCodeNode = RootPaymentCodeNode;
        }
        getPaymentWallet(bobsRootPaymentCodeNode, index) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw Error('Root Payment code or network not set');
            const alicePrivateNode = this.RootPaymentCodeNode.derive(index);
            const bobsFirstPaymentCodeNode = bobsRootPaymentCodeNode.derive(0);
            const s = (0, utils_1.getSharedSecret)(ecc, bobsFirstPaymentCodeNode.publicKey, alicePrivateNode.privateKey);
            const prvKey = (0, utils_1.uintArrayToBuffer)(ecc.privateAdd(alicePrivateNode.privateKey, s));
            return BIP47.bip32.fromPrivateKey(prvKey, bobsFirstPaymentCodeNode.chainCode, this.network.network);
        }
        getPaymentCodeNode() {
            return this.RootPaymentCodeNode;
        }
        getPaymentAddress(bobsRootPaymentCodeNode, index) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw new Error('Root Payment code or network not set');
            const firstAlicePaymentCodeNode = this.RootPaymentCodeNode.derive(0);
            const bobPaymentCodeNode = bobsRootPaymentCodeNode.derive(index);
            const a = firstAlicePaymentCodeNode.privateKey;
            const B = bobPaymentCodeNode.publicKey;
            const s = (0, utils_1.getSharedSecret)(ecc, B, a);
            const sG = ecc.pointMultiply(BIP47.G, s, true);
            const BPrime = (0, utils_1.uintArrayToBuffer)(ecc.pointAdd(B, sG, true));
            const node = BIP47.bip32.fromPublicKey(BPrime, bobPaymentCodeNode.chainCode, this.network.network);
            return this.getAddressFromNode(node);
        }
        getSerializedPaymentCode() {
            return bs58check_ts_1.default.encode(Buffer.concat([Buffer.from([71]), this.getBinaryPaymentCode()]));
        }
        getBinaryPaymentCode() {
            if (!this.network || !this.RootPaymentCodeNode)
                throw Error('Root Payment code or network not set');
            const node = this.RootPaymentCodeNode;
            const paymentCodeSerializedBuffer = Buffer.alloc(80);
            paymentCodeSerializedBuffer[0] = 0x01; // version
            paymentCodeSerializedBuffer[1] = 0x00; // must be zero
            paymentCodeSerializedBuffer[2] = node.publicKey[0]; // sign 2 or 3
            paymentCodeSerializedBuffer.fill(node.publicKey.slice(1), 3, 35); // pubkey
            paymentCodeSerializedBuffer.fill(node.chainCode, 35, 67); // chain code
            return paymentCodeSerializedBuffer;
        }
        getNotificationNode() {
            if (!this.network || !this.RootPaymentCodeNode)
                throw Error('Root Payment code or network not set');
            return this.RootPaymentCodeNode.derive(0);
        }
        getNotificationNodeFromPaymentCode(paymentCode) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw Error('Root Payment code or network not set');
            return (0, utils_1.getPublicPaymentCodeNodeFromBase58)(ecc, paymentCode, this.network);
        }
        getNotificationAddressFromPaymentCode(paymentCode) {
            return this.getAddressFromNode(this.getNotificationNodeFromPaymentCode(paymentCode));
        }
        getNotificationAddress() {
            return this.getAddressFromNode(this.getNotificationNode());
        }
        getAddressFromNode(node, network = this.network) {
            return bitcoin.payments.p2pkh({
                pubkey: node.publicKey,
                network: network === null || network === void 0 ? void 0 : network.network,
            }).address;
        }
        getBlindedPaymentCode(bobBIP47, privateKey, outpoint) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw Error('Root Payment code or network not set');
            if (typeof privateKey === 'string')
                privateKey = Buffer.from(privateKey, 'hex');
            if (typeof outpoint === 'string')
                outpoint = Buffer.from(outpoint, 'hex');
            const a = privateKey;
            const B = bobBIP47.getNotificationNode().publicKey;
            const S = (0, utils_1.uintArrayToBuffer)(ecc.pointMultiply(B, a));
            const x = (0, utils_1.uintArrayToBuffer)(ecc.xOnlyPointFromPoint(S));
            const o = outpoint;
            const s = crypto.hmacSHA512(o, x);
            const binaryPaymentCode = this.getBinaryPaymentCode();
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
            else if (bitcoin.script.toASM(first.script).split(' ').length === 2)
                pubKey = Buffer.from(bitcoin.script.toASM(first.script).split(' ')[1], 'hex');
            else
                throw Error('Unknown Transaction type');
            return {
                outpoint,
                pubKey,
            };
        }
        getPaymentCodeFromRawNotificationTransaction(rawHexNotificationData) {
            const tx = bitcoin.Transaction.fromHex(rawHexNotificationData);
            const { pubKey, outpoint } = this.getFirstExposedPubKeyAndOutpoint(tx);
            const A = pubKey;
            const b = this.getNotificationNode().privateKey;
            const S = (0, utils_1.uintArrayToBuffer)(ecc.pointMultiply(A, b));
            const x = (0, utils_1.uintArrayToBuffer)(ecc.xOnlyPointFromPoint(S));
            const s = crypto.hmacSHA512(outpoint, x);
            const opReturnOutput = tx.outs.find((o) => o.script.toString('hex').startsWith('6a4c50'));
            if (!opReturnOutput)
                throw Error('No OP_RETURN output in notification');
            const binaryPaymentCode = opReturnOutput.script.slice(3);
            binaryPaymentCode.fill((0, xor_1.xor)(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35);
            binaryPaymentCode.fill((0, xor_1.xor)(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67);
            return bs58check_ts_1.default.encode(Buffer.concat([Buffer.from([71]), binaryPaymentCode]));
        }
    }
    BIP47.G = Buffer.from('0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798', 'hex');
    BIP47.bip32 = (0, bip32_1.default)(ecc);
    function fromPaymentCode(paymentCode, network = networks_1.mainnetData) {
        return new BIP47(network, (0, utils_1.getPublicPaymentCodeNodeFromBase58)(ecc, paymentCode, network));
    }
    function fromBip39Seed(bip39Seed, network = networks_1.mainnetData, password) {
        return new BIP47(network, (0, utils_1.getRootPaymentCodeNodeFromBIP39Seed)(ecc, bip39Seed, network, password));
    }
    function fromSeedHex(seedHex, network = networks_1.mainnetData) {
        return new BIP47(network, (0, utils_1.getRootPaymentCodeNodeFromSeedHex)(ecc, seedHex, network));
    }
    return {
        fromSeedHex,
        fromBip39Seed,
        fromPaymentCode,
    };
}
exports.BIP47Factory = BIP47Factory;
