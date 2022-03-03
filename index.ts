import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib'
import base58check from 'bs58check-ts'

function bufferToHexString(buffer: Buffer | undefined): String {
    if (buffer !== undefined)
        return [...buffer].map((b) => Number(b).toString(16)).join('');
    return ""
}

function getAddress(node: any, network?: any): string {
    return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address!;
}

// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc);


let sampleSeed: string = "submit enough hand diagram close local rhythm goose path fade almost quick"

let seed: Buffer = bip39.mnemonicToSeedSync(sampleSeed)
let node: BIP32Interface = bip32.fromSeed(seed);

let paymentCodeNode: BIP32Interface = node.derivePath("m/47'/0'/0'");

let BIP47NotificationNode = paymentCodeNode.derive(0);
console.log(getAddress(BIP47NotificationNode));

// payment code serialize
let paymentCodeSerializedBuffer: Buffer = Buffer.alloc(81);
paymentCodeSerializedBuffer[0] = 71;
paymentCodeSerializedBuffer[1] = 0x01; // version
paymentCodeSerializedBuffer[2] = 0x00; // must be zero
paymentCodeSerializedBuffer[3] = 0x03; // sign 2 or 3
paymentCodeSerializedBuffer.fill(paymentCodeNode.publicKey.slice(1), 4, 36); // pubkey
paymentCodeSerializedBuffer.fill(paymentCodeNode.chainCode, 36, 68); // chain code


const payment = base58check.encode(paymentCodeSerializedBuffer)
const actual = "PM8TJZ1Bzg526N1i3QLYvoohMfdrax9kRZiyncDmN4ZAMTdeenX3ETa2WHMDpEGtzq7eKaiWC4DHsQYR6fsiFYBPNhCDWmMKZpqkfQgnJPVvLRBpgYn9";
console.log(payment)
console.log(actual)
console.log(payment == actual)




// extended private and public key are required
// Each extended key has 2^31 normal child keys, and 2^31 hardened child keys. 
// Each of these child keys has an index. The normal child keys use indices 0 through 2^(31)-1. 
// The hardened child keys use indices 2^31 through 2^(32)-1

