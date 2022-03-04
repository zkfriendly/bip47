import * as bip39 from 'bip39';
import BIP32Factory, {BIP32API, BIP32Interface} from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib'
import base58check from 'bs58check-ts';
import {Network} from "bitcoinjs-lib";
import * as crypto from 'crypto'
import {xor} from "./xor";

type NetworkCoin = {
    'network': Network,
    'coin': string
}

class BIP47 {
    static G: Buffer = Buffer.from("0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 'hex');
    static bip32: BIP32API = BIP32Factory(ecc);

    network: NetworkCoin | undefined;
    masterPaymentCodeNode: BIP32Interface | undefined;

    static fromPaymentCode(paymentCode: string, network: NetworkCoin = network_data_mainnet): BIP47 {
        let bip47 = new BIP47()
        bip47.network = network;
        bip47.masterPaymentCodeNode = BIP47.getPublicPaymentCodeNodeFromBase58(paymentCode, network);
        return bip47;
    }

    static fromBIP39Seed(bip39Seed: string, network: NetworkCoin = network_data_mainnet, password?: string): BIP47 {
        let bip47 = new BIP47()
        bip47.network = network;
        bip47.masterPaymentCodeNode = BIP47.getMasterPaymentCodeNodeFromBIP39Seed(bip39Seed, network, password);
        return bip47;
    }

    getWalletNodeForPaymentCodeAtIndex(bobMasterPublicPaymentCodeNode: BIP32Interface,index: number): BIP32Interface {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";

        const alicePrivateNode: BIP32Interface = this.masterPaymentCodeNode.derive(index);
        const zerothBobPaymentNode: BIP32Interface = bobMasterPublicPaymentCodeNode.derive(0);
        const s = BIP47.getSharedSecret(zerothBobPaymentNode.publicKey, alicePrivateNode.privateKey as Buffer);
        if (!ecc.isPrivate(s))
            throw new TypeError('Invalid shared secret');
        const prvKeyUint = ecc.privateAdd(alicePrivateNode.privateKey as Buffer, s) as Buffer;
        const prvKey: Buffer = Buffer.alloc(32);
        for (let i = 0 ; i < prvKey.length;i++) prvKey[i] = prvKeyUint[i]
        return BIP47.bip32.fromPrivateKey(prvKey, zerothBobPaymentNode.chainCode, this.network.network);
    }

    getPaymentAddressForPaymentCodeNodeAtIndex(bobMasterPublicPaymentCodeNode: BIP32Interface,index: number): string {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
        const zerothAlicePaymentCodeNode: BIP32Interface = this.masterPaymentCodeNode.derive(0)
        const currentBobPublicPaymentCodeNode: BIP32Interface = bobMasterPublicPaymentCodeNode.derive(index)

        const a: Buffer = zerothAlicePaymentCodeNode.privateKey as Buffer
        const B: Buffer = currentBobPublicPaymentCodeNode.publicKey
        const s = BIP47.getSharedSecret(B, a);
        const sG: Buffer = ecc.pointMultiply(BIP47.G, s, true) as Buffer;
        const BPrime: Uint8Array = ecc.pointAdd(B, sG, true) as Uint8Array;
        const BPrimeBuffer: Buffer = Buffer.alloc(33);
        for (let i = 0; i < BPrimeBuffer.length; i++) BPrimeBuffer[i] = BPrime[i];

        let node:BIP32Interface = BIP47.bip32.fromPublicKey(BPrimeBuffer,
            currentBobPublicPaymentCodeNode.chainCode,
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
        return base58check.encode(Buffer.concat([Buffer.from([71]),this.getBinaryPaymentCode()]));
    }

    getBinaryPaymentCode(): Buffer {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
        let node = this.masterPaymentCodeNode;
        let paymentCodeSerializedBuffer: Buffer = Buffer.alloc(80);
        paymentCodeSerializedBuffer[0] = 0x01; // version
        paymentCodeSerializedBuffer[1] = 0x00; // must be zero
        paymentCodeSerializedBuffer[2] = node.publicKey[0] // sign 2 or 3
        paymentCodeSerializedBuffer.fill(node.publicKey.slice(1), 3, 35); // pubkey
        paymentCodeSerializedBuffer.fill(node.chainCode, 35, 67); // chain code
        return paymentCodeSerializedBuffer
    }

    getNotificationNode(): BIP32Interface {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
        return this.masterPaymentCodeNode.derive(0);
    }

    getNotificationNodeFromPaymentCode(paymentCode: string): BIP32Interface {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";
        return BIP47.getPublicPaymentCodeNodeFromBase58(paymentCode, this.network);
    }

    getNotificationAddressFromPaymentCode(paymentCode: string): string {
        return this.getAddressFromNode(this.getNotificationNodeFromPaymentCode(paymentCode));
    }

    getNotificationAddress(): string {
        return this.getAddressFromNode(this.getNotificationNode());
    }

    static getPublicPaymentCodeNodeFromBase58(paymentCode: string, network: NetworkCoin): BIP32Interface {
        let rawPaymentCode = base58check.decode(paymentCode);
        return BIP47.bip32.fromPublicKey(rawPaymentCode.slice(3, 36), rawPaymentCode.slice(36, 68), network.network);
    }

    static getMasterPaymentCodeNodeFromBIP39Seed(bip39Seed: string, network: NetworkCoin, password?: string) {
        let seed: Buffer = bip39.mnemonicToSeedSync(bip39Seed, password)
        let node: BIP32Interface = BIP47.bip32.fromSeed(seed, network.network);
        return node.derivePath(`m/47'/${network.coin}'/0'`);
    }

    static UintArrayToHexString(buffer: Buffer | undefined): string {
        if (buffer !== undefined)
            return [...buffer].map((b) => Number(b).toString(16)).join('');
        return ""
    }

    getAddressFromNode(node: BIP32Interface, network=this.network): string {
        return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: network?.network }).address!;
    }

    uintArrayToBuffer(array: Uint8Array): Buffer {
        const b: Buffer = Buffer.alloc(array.length);
        for (let i = 0 ; i < array.length ; i++) b[i] = array[i]
        return b;
    }

    getNotificationOut(bobBIP47: BIP47) {
        if (!this.network || !this.masterPaymentCodeNode)
            throw "Master Payment code or network not set";

        let bip = BIP47.bip32.fromPrivateKey(Buffer.from('1b7a10f45118e2519a8dd46ef81591c1ae501d082b6610fdda3de7a3c932880d', 'hex'), this.masterPaymentCodeNode.chainCode);

        const a: Buffer = bip.privateKey as Buffer;
        const B: Buffer = bobBIP47.getNotificationNode().publicKey;
        const S: Buffer = this.uintArrayToBuffer(ecc.pointMultiply(B, a) as Buffer);

        const x: Buffer = this.uintArrayToBuffer(ecc.xOnlyPointFromPoint(S) as Buffer);
        const o: Buffer = Buffer.from('86f411ab1c8e70ae8a0795ab7a6757aea6e4d5ae1826fc7b8f00c597d500609c01000000', 'hex')
        let _hmac = crypto.createHmac('sha512', o);
        let s = _hmac.update(x).digest();

        let binaryPaymentCode: Buffer = this.getBinaryPaymentCode()
        binaryPaymentCode.fill(xor(s.slice(0, 32), binaryPaymentCode.slice(3, 35)), 3, 35)
        binaryPaymentCode.fill(xor(s.slice(32, 64), binaryPaymentCode.slice(35, 67)), 35, 67)

        return binaryPaymentCode.toString('hex')
    }

}


let network_data_testnet: NetworkCoin = {
    'network': bitcoin.networks.testnet,
    'coin': "1"
}
let network_data_mainnet: NetworkCoin = {
    'network': bitcoin.networks.bitcoin,
    'coin': "0"
}
let bip39Seed: string = "response seminar brave tip suit recall often sound stick owner lottery motion"

let aliceBIP47 = BIP47.fromBIP39Seed(bip39Seed)
let bobBIP47 = BIP47.fromPaymentCode("PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97");
console.assert(aliceBIP47.getSerializedPaymentCode() == "PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA", "Payment Code Failed")
console.assert(aliceBIP47.getNotificationAddress() == "1JDdmqFLhpzcUwPeinhJbUPw4Co3aWLyzW", "Notification address mismatch")
console.assert(bobBIP47.getNotificationAddress() == "1ChvUUvht2hUQufHBXF8NgLhW8SwE2ecGV", "Bob notif address mismatch");
console.assert(bobBIP47.getNotificationNode().publicKey.toString('hex') == "024ce8e3b04ea205ff49f529950616c3db615b1e37753858cc60c1ce64d17e2ad8", "Bob notif pubkey mismatch")

aliceBIP47.getNotificationOut(bobBIP47)