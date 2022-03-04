import * as bip39 from 'bip39';
import BIP32Factory, {BIP32API, BIP32Interface} from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib'
import base58check from 'bs58check-ts';
import {Network} from "bitcoinjs-lib";

type NetworkCoin = {
    'network': Network,
    'coin': string
}

class BIP47 {
    static G: Buffer = Buffer.from("0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 'hex');
    static bip32: BIP32API = BIP32Factory(ecc);

    network: NetworkCoin;
    masterPaymentCodeNode: BIP32Interface;

    constructor(bip39Seed: string, network: NetworkCoin, password?: string) {
        this.network = network;
        this.masterPaymentCodeNode = BIP47.getMasterPaymentCodeNodeFromBIP39Seed(bip39Seed, this.network, password);
    }

    getWalletNodeForPaymentCodeAtIndex(bobMasterPublicPaymentCodeNode: BIP32Interface,index: number): BIP32Interface {
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
        let node = this.masterPaymentCodeNode;
        let paymentCodeSerializedBuffer: Buffer = Buffer.alloc(81);
        paymentCodeSerializedBuffer[0] = 71;
        paymentCodeSerializedBuffer[1] = 0x01; // version
        paymentCodeSerializedBuffer[2] = 0x00; // must be zero
        paymentCodeSerializedBuffer[3] = node.publicKey[0] // sign 2 or 3
        paymentCodeSerializedBuffer.fill(node.publicKey.slice(1), 4, 36); // pubkey
        paymentCodeSerializedBuffer.fill(node.chainCode, 36, 68); // chain code
        return base58check.encode(paymentCodeSerializedBuffer)
    }

    getNotificationNode(): BIP32Interface {
        return this.masterPaymentCodeNode.derive(0);
    }

    getNotificationNodeFromPaymentCode(paymentCode: string): BIP32Interface {
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

    getAddressFromNode(node: BIP32Interface): string {
        return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: this.network.network }).address!;
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
let bip39Seed: string = "submit enough hand diagram close local rhythm goose path fade almost quick"

let bip47wallet = new BIP47(bip39Seed, network_data_testnet);
let bobNode = BIP47.getPublicPaymentCodeNodeFromBase58("PM8TJaz19chXNgWBbuFyFJQqjTAMpAffgGkAXZZsSCkxVCSBJtqju3v26BSU98WkmhurgoBTyJfhckPzBGnjaXoCkjzg7u6gaAq8nbDUTbhFnuYNMLhf", network_data_testnet);
console.log("My Notification Address ",bip47wallet.getNotificationAddress());
console.log(bip47wallet.getPaymentAddressForPaymentCodeNodeAtIndex(bobNode, 0));
