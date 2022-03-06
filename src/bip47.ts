import * as bip39 from 'bip39';
import BIP32Factory, { BIP32API, BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib'
import base58check from 'bs58check-ts';
import * as crypto from 'crypto'
import { xor } from "./xor";
import { PubkeyOutpoint, NetworkCoin } from './interfaces'
import { mainnetData } from './networks'

export class Bip47Util {
    static G: Buffer = Buffer.from("0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 'hex');
    static bip32: BIP32API = BIP32Factory(ecc);

    network: NetworkCoin | undefined;
    RootPaymentCodeNode: BIP32Interface | undefined;

    static fromPaymentCode(paymentCode: string, network: NetworkCoin = mainnetData): Bip47Util {
        let bip47 = new Bip47Util()
        bip47.network = network;
        bip47.RootPaymentCodeNode = Bip47Util.getPublicPaymentCodeNodeFromBase58(paymentCode, network);
        return bip47;
    }

    static fromBip39Seed(bip39Seed: string, network: NetworkCoin = mainnetData, password?: string): Bip47Util {
        let bip47 = new Bip47Util()
        bip47.network = network;
        bip47.RootPaymentCodeNode = Bip47Util.getRootPaymentCodeNodeFromBIP39Seed(bip39Seed, network, password);
        return bip47;
    }

    static fromSeedHex(seedHex: string | Buffer, network: NetworkCoin = mainnetData): Bip47Util {
        let bip47 = new Bip47Util()
        bip47.network = network;
        bip47.RootPaymentCodeNode = Bip47Util.getRootPaymentCodeNodeFromSeedHex(seedHex, network);
        return bip47;
    }

    getPaymentWallet(bobsRootPaymentCodeNode: BIP32Interface, index: number): BIP32Interface {
        if (!this.network || !this.RootPaymentCodeNode)
            throw Error("Root Payment code or network not set");

        const alicePrivateNode: BIP32Interface = this.RootPaymentCodeNode.derive(index);
        const bobsFirstPaymentCodeNode: BIP32Interface = bobsRootPaymentCodeNode.derive(0);
        const s = Bip47Util.getSharedSecret(bobsFirstPaymentCodeNode.publicKey, alicePrivateNode.privateKey as Buffer);
        const prvKey = Bip47Util.uintArrayToBuffer(ecc.privateAdd(alicePrivateNode.privateKey as Buffer, s) as Buffer);
        return Bip47Util.bip32.fromPrivateKey(prvKey, bobsFirstPaymentCodeNode.chainCode, this.network.network);
    }

    getPaymentCodeNode(): BIP32Interface {
        return this.RootPaymentCodeNode as BIP32Interface;
    }

    getPaymentAddress(bobsRootPaymentCodeNode: BIP32Interface, index: number): string {
        if (!this.network || !this.RootPaymentCodeNode)
            throw "Root Payment code or network not set";
        const firstAlicePaymentCodeNode: BIP32Interface = this.RootPaymentCodeNode.derive(0)
        const bobPaymentCodeNode: BIP32Interface = bobsRootPaymentCodeNode.derive(index)

        const a: Buffer = firstAlicePaymentCodeNode.privateKey as Buffer
        const B: Buffer = bobPaymentCodeNode.publicKey
        const s = Bip47Util.getSharedSecret(B, a);
        const sG: Buffer = ecc.pointMultiply(Bip47Util.G, s, true) as Buffer;
        const BPrime: Buffer = Bip47Util.uintArrayToBuffer(ecc.pointAdd(B, sG, true) as Buffer);

        let node: BIP32Interface = Bip47Util.bip32.fromPublicKey(BPrime,
            bobPaymentCodeNode.chainCode,
            this.network.network);
        return this.getAddressFromNode(node);
    }

    static getSharedSecret(B: Buffer, a: Buffer) {
        const SUint: Uint8Array = ecc.xOnlyPointFromPoint(ecc.pointMultiply(B, a, true) as Uint8Array) as Uint8Array;
        const S: Buffer = Buffer.alloc(32);
        for (let i = 0; i < S.length; i++) S[i] = SUint[i]  // uint8Array to Buffer
        return bitcoin.crypto.sha256(S);
    }

    getSerializedPaymentCode(): string {
        return base58check.encode(Buffer.concat([Buffer.from([71]), this.getBinaryPaymentCode()]));
    }

    getBinaryPaymentCode(): Buffer {
        if (!this.network || !this.RootPaymentCodeNode)
            throw Error("Root Payment code or network not set");
        let node = this.RootPaymentCodeNode;
        let paymentCodeSerializedBuffer: Buffer = Buffer.alloc(80);
        paymentCodeSerializedBuffer[0] = 0x01; // version
        paymentCodeSerializedBuffer[1] = 0x00; // must be zero
        paymentCodeSerializedBuffer[2] = node.publicKey[0] // sign 2 or 3
        paymentCodeSerializedBuffer.fill(node.publicKey.slice(1), 3, 35); // pubkey
        paymentCodeSerializedBuffer.fill(node.chainCode, 35, 67); // chain code
        return paymentCodeSerializedBuffer
    }

    getNotificationNode(): BIP32Interface {
        if (!this.network || !this.RootPaymentCodeNode)
            throw Error("Root Payment code or network not set");
        return this.RootPaymentCodeNode.derive(0);
    }

    getNotificationNodeFromPaymentCode(paymentCode: string): BIP32Interface {
        if (!this.network || !this.RootPaymentCodeNode)
            throw Error("Root Payment code or network not set");
        return Bip47Util.getPublicPaymentCodeNodeFromBase58(paymentCode, this.network);
    }

    getNotificationAddressFromPaymentCode(paymentCode: string): string {
        return this.getAddressFromNode(this.getNotificationNodeFromPaymentCode(paymentCode));
    }

    getNotificationAddress(): string {
        return this.getAddressFromNode(this.getNotificationNode());
    }

    static getPublicPaymentCodeNodeFromBase58(paymentCode: string, network: NetworkCoin): BIP32Interface {
        let rawPaymentCode = base58check.decode(paymentCode);
        return Bip47Util.bip32.fromPublicKey(rawPaymentCode.slice(3, 36), rawPaymentCode.slice(36, 68), network.network);
    }

    static getRootPaymentCodeNodeFromBIP39Seed(bip39Seed: string, network: NetworkCoin = mainnetData, password?: string) {
        let seed: Buffer = bip39.mnemonicToSeedSync(bip39Seed, password);
        return Bip47Util.getRootPaymentCodeNodeFromSeedHex(seed);
    }

    static getRootPaymentCodeNodeFromSeedHex(seedHex: string | Buffer, network: NetworkCoin = mainnetData) {
        if (typeof seedHex == 'string')
            seedHex = Buffer.from(seedHex, 'hex');

        let node: BIP32Interface = Bip47Util.bip32.fromSeed(seedHex, network.network);
        return node.derivePath(`m/47'/${network.coin}'/0'`);
    }

    static UintArrayToHexString(buffer: Buffer | undefined): string {
        if (buffer !== undefined)
            return [...buffer].map((b) => Number(b).toString(16)).join('');
        return ""
    }

    getAddressFromNode(node: BIP32Interface, network = this.network): string {
        return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: network?.network }).address!;
    }

    static uintArrayToBuffer(array: Uint8Array): Buffer {
        const b: Buffer = Buffer.alloc(array.length);
        for (let i = 0; i < array.length; i++) b[i] = array[i]
        return b;
    }


    getBlindedPaymentCode(bobBIP47: Bip47Util, privateKey: string | Buffer, outpoint: string | Buffer): string {
        if (!this.network || !this.RootPaymentCodeNode)
            throw Error("Root Payment code or network not set");

        if (typeof privateKey == 'string')
            privateKey = Buffer.from(privateKey, 'hex');

        if (typeof outpoint == 'string')
            outpoint = Buffer.from(outpoint, 'hex');

        const a: Buffer = privateKey;
        const B: Buffer = bobBIP47.getNotificationNode().publicKey;
        const S: Buffer = Bip47Util.uintArrayToBuffer(ecc.pointMultiply(B, a) as Buffer);

        const x: Buffer = Bip47Util.uintArrayToBuffer(ecc.xOnlyPointFromPoint(S) as Buffer);
        const o: Buffer = outpoint
        let _hmac = crypto.createHmac('sha512', o);
        let s = _hmac.update(x).digest();

        let binaryPaymentCode: Buffer = this.getBinaryPaymentCode()
        binaryPaymentCode.fill(xor(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35)
        binaryPaymentCode.fill(xor(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67)

        return binaryPaymentCode.toString('hex')
    }

    getFirstExposedPubKeyAndOutpoint(tx: bitcoin.Transaction): PubkeyOutpoint {
        const first: bitcoin.TxInput = tx.ins[0];
        const hash: Buffer = first.hash;
        const index: number = first.index;

        const indexHex = index.toString(16).padStart(8, '0');
        const outpoint = Buffer.from(hash.toString('hex') + indexHex, 'hex')


        let pubKey: Buffer | null = null;

        if (first.witness.length)
            pubKey = first.witness[1]
        else if (bitcoin.script.toASM(first.script).split(' ').length == 2)
            pubKey = Buffer.from(bitcoin.script.toASM(first.script).split(' ')[1], 'hex')
        else
            throw Error("Unknown Transaction type")

        return {
            'outpoint': outpoint,
            'pubKey': pubKey
        }

    }

    getPaymentCodeFromRawNotificationTransaction(rawHexNotificationData: string) {

        let tx: bitcoin.Transaction = bitcoin.Transaction.fromHex(rawHexNotificationData);
        let { pubKey, outpoint } = this.getFirstExposedPubKeyAndOutpoint(tx);
        let A: Buffer = pubKey;
        let b: Buffer = this.getNotificationNode().privateKey as Buffer
        let S: Buffer = Bip47Util.uintArrayToBuffer(ecc.pointMultiply(A, b) as Buffer);
        let x: Buffer = Bip47Util.uintArrayToBuffer(ecc.xOnlyPointFromPoint(S));
        let _hmac = crypto.createHmac('sha512', outpoint);
        let s: Buffer = _hmac.update(x).digest();

        let opReturnOutput = tx.outs.find((o) => o.script.toString('hex').startsWith('6a4c50'))

        if (!opReturnOutput)
            throw Error("No OP_RETURN output in notification")

        let binaryPaymentCode: Buffer = opReturnOutput.script.slice(3);

        binaryPaymentCode.fill(xor(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35)
        binaryPaymentCode.fill(xor(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67)

        return base58check.encode(Buffer.concat([Buffer.from([71]), binaryPaymentCode]));
    }
}