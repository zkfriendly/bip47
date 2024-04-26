"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIP47Factory = void 0;
const bip32_1 = require("bip32");
const bitcoin = require("bitcoinjs-lib");
const crypto = require("./crypto");
const xor_1 = require("./xor");
const networks_1 = require("./networks");
const utils_1 = require("./utils");
const bs58check = require('bs58check');
function BIP47Factory(ecc) {
    // TODO: implement a test assertion function for ecc
    const bip32 = (0, bip32_1.default)(ecc);
    const G = Buffer.from('0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798', 'hex');
    const { getPublicPaymentCodeNodeFromBase58, getRootPaymentCodeNodeFromSeedHex, getRootPaymentCodeNodeFromBIP39Seed, uintArrayToBuffer, getSharedSecret, toInternalByteOrder, } = (0, utils_1.default)(ecc, bip32);
    class BIP47 {
        constructor(network, RootPaymentCodeNode) {
            this.network = network;
            this.RootPaymentCodeNode = RootPaymentCodeNode;
        }
        getPaymentWallet(aliceNode, index) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw new Error('Root Payment code node or network not set');
            const bobNode = this.RootPaymentCodeNode.derive(index);
            if (bobNode.privateKey === undefined)
                throw new Error('Missing private key to generate payment wallets');
            const firstAliceNode = aliceNode.derive(0);
            const s = getSharedSecret(firstAliceNode.publicKey, bobNode.privateKey);
            const prvKeyUint8 = ecc.privateAdd(bobNode.privateKey, s);
            if (prvKeyUint8 === null)
                throw new Error('Could not calculate private key');
            const prvKey = uintArrayToBuffer(prvKeyUint8);
            return bip32.fromPrivateKey(prvKey, bobNode.chainCode, this.network.network);
        }
        getReceiveWallet(bobNode, index) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw new Error('Root Payment code node or network not set');
            const aliceNode = this.RootPaymentCodeNode.derive(0);
            bobNode = bobNode.derive(index);
            if (aliceNode.privateKey === undefined)
                throw new Error('Missing private key to generate receive wallets');
            const s = getSharedSecret(bobNode.publicKey, aliceNode.privateKey);
            const sG = ecc.pointMultiply(G, s, true);
            if (sG === null)
                throw new Error('Could not calculate private key');
            const pubKeyUint8 = ecc.pointAdd(bobNode.publicKey, sG);
            if (pubKeyUint8 === null)
                throw new Error('Could not sum pub keys');
            const pubKey = uintArrayToBuffer(pubKeyUint8);
            return bip32.fromPublicKey(pubKey, bobNode.chainCode, this.network.network);
        }
        getPaymentCodeNode() {
            return this.RootPaymentCodeNode;
        }
        getPaymentAddress(bobsRootPaymentCodeNode, index) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw new Error('Root Payment code or network not set');
            const firstAlicePaymentCodeNode = this.RootPaymentCodeNode.derive(0);
            const bobPaymentCodeNode = bobsRootPaymentCodeNode.derive(index);
            if (firstAlicePaymentCodeNode.privateKey === undefined)
                throw new Error('Missing private key to generate payment address');
            const a = firstAlicePaymentCodeNode.privateKey;
            const B = bobPaymentCodeNode.publicKey;
            const s = getSharedSecret(B, a);
            const sGUint = ecc.pointMultiply(G, s, true);
            if (sGUint === null)
                throw new Error('Could not compute sG');
            const sG = uintArrayToBuffer(sGUint);
            const BPrimeUint = ecc.pointAdd(B, sG, true);
            if (BPrimeUint === null)
                throw new Error('Could not calculate pubkey');
            const BPrime = uintArrayToBuffer(BPrimeUint);
            if (!ecc.isPoint(BPrime))
                throw new Error('Calculate Pubkey is invalid');
            const node = bip32.fromPublicKey(BPrime, bobPaymentCodeNode.chainCode, this.network.network);
            return this.getAddressFromNode(node);
        }
        getSerializedPaymentCode() {
            return bs58check.encode(Buffer.concat([Buffer.from([71]), this.getBinaryPaymentCode()]));
        }
        getBinaryPaymentCode() {
            if (!this.network || !this.RootPaymentCodeNode)
                throw new Error('Root Payment code or network not set');
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
                throw new Error('Root Payment code or network not set');
            return this.RootPaymentCodeNode.derive(0);
        }
        getNotificationNodeFromPaymentCode(paymentCode) {
            if (!this.network || !this.RootPaymentCodeNode)
                throw new Error('Root Payment code or network not set');
            return getPublicPaymentCodeNodeFromBase58(paymentCode, this.network);
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
                throw new Error('Root Payment code or network not set');
            if (typeof privateKey === 'string')
                privateKey = Buffer.from(privateKey, 'hex');
            if (typeof outpoint === 'string')
                outpoint = Buffer.from(outpoint, 'hex');
            const a = privateKey;
            const B = bobBIP47.getNotificationNode().publicKey;
            const S = uintArrayToBuffer(ecc.pointMultiply(B, a));
            const x = uintArrayToBuffer(S.slice(1, 33));
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
            const indexHex = this.getInternalByteOrderHex(index);
            const outpoint = Buffer.from(hash.toString('hex') + indexHex, 'hex');
            let pubKey = null;
            if (first.witness.length)
                pubKey = first.witness[1];
            else if (bitcoin.script.toASM(first.script).split(' ').length === 2)
                pubKey = Buffer.from(bitcoin.script.toASM(first.script).split(' ')[1], 'hex');
            else
                throw new Error('Unknown Transaction type');
            return {
                outpoint,
                pubKey,
            };
        }
        getInternalByteOrderHex(index) {
            const tmpIndex = index.toString(16).padStart(8, '0');
            const indexBuffer = toInternalByteOrder(Buffer.from(tmpIndex, 'hex'));
            const indexHex = indexBuffer.toString('hex');
            return indexHex;
        }
        getPaymentCodeFromRawNotificationTransaction(rawHexNotificationData) {
            const tx = bitcoin.Transaction.fromHex(rawHexNotificationData);
            // tslint:disable-next-line:prefer-const
            let { pubKey, outpoint } = this.getFirstExposedPubKeyAndOutpoint(tx);
            const A = pubKey;
            const b = this.getNotificationNode().privateKey;
            const S = uintArrayToBuffer(ecc.pointMultiply(A, b));
            const x = uintArrayToBuffer(S.slice(1, 33));
            const s = crypto.hmacSHA512(outpoint, x);
            const opReturnOutput = tx.outs.find((o) => o.script.toString('hex').startsWith('6a4c50'));
            if (!opReturnOutput)
                throw new Error('No OP_RETURN output in notification');
            const binaryPaymentCode = opReturnOutput.script.slice(3);
            binaryPaymentCode.fill((0, xor_1.xor)(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35);
            binaryPaymentCode.fill((0, xor_1.xor)(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67);
            return bs58check.encode(Buffer.concat([Buffer.from([71]), binaryPaymentCode]));
        }
    }
    function fromPaymentCode(paymentCode, network = networks_1.mainnetData) {
        return new BIP47(network, getPublicPaymentCodeNodeFromBase58(paymentCode, network));
    }
    function fromBip39Seed(bip39Seed, network = networks_1.mainnetData, password) {
        return new BIP47(network, getRootPaymentCodeNodeFromBIP39Seed(bip39Seed, network, password));
    }
    function fromSeedHex(seedHex, network = networks_1.mainnetData) {
        return new BIP47(network, getRootPaymentCodeNodeFromSeedHex(seedHex, network));
    }
    return {
        fromSeedHex,
        fromBip39Seed,
        fromPaymentCode,
    };
}
exports.BIP47Factory = BIP47Factory;
