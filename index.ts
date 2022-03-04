import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib'
import base58check from 'bs58check-ts';

const G: Buffer = Buffer.from("0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 'hex');

function bufferToHexString(buffer: Buffer | undefined): string {
    if (buffer !== undefined)
        return [...buffer].map((b) => Number(b).toString(16)).join('');
    return ""
}

function getAddress(node: any, network?: any): string {
    return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address!;
}


let network_data_testnet = {
    'network': bitcoin.networks.testnet,
    'coin': "1"
}
let network_data_mainnet = {
    'network': bitcoin.networks.bitcoin,
    'coin': "0"
}

// choose network
let network = network_data_mainnet;

// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc);


let bip39Seed: string = "response seminar brave tip suit recall often sound stick owner lottery motion"

// seed from bip39 seed phrase
let seed: Buffer = bip39.mnemonicToSeedSync(bip39Seed)
let node: BIP32Interface = bip32.fromSeed(seed, network.network);

// payment code node from master node
let paymentCodeNode: BIP32Interface = node.derivePath(`m/47'/${network.coin}'/0'`);

// notification node from payment code node
let BIP47NotificationNode: BIP32Interface = paymentCodeNode.derive(0);

// payment code serialize
let paymentCodeSerializedBuffer: Buffer = Buffer.alloc(81);
paymentCodeSerializedBuffer[0] = 71;
paymentCodeSerializedBuffer[1] = 0x01; // version
paymentCodeSerializedBuffer[2] = 0x00; // must be zero
paymentCodeSerializedBuffer[3] = paymentCodeNode.publicKey[0] // sign 2 or 3
paymentCodeSerializedBuffer.fill(paymentCodeNode.publicKey.slice(1), 4, 36); // pubkey
paymentCodeSerializedBuffer.fill(paymentCodeNode.chainCode, 36, 68); // chain code


let index: number = 0;

const paymentCodeSerialized: string = base58check.encode(paymentCodeSerializedBuffer)
const bobPaymentCodeBuffer: Buffer = base58check.decode("PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97")
const bobPublicKeyNode: BIP32Interface = bip32.fromPublicKey(bobPaymentCodeBuffer.slice(3, 36), bobPaymentCodeBuffer.slice(36, 68))

console.log(paymentCodeSerialized == "PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA")

const bobPublicDepositNode: BIP32Interface = bobPublicKeyNode.derive(index)
// see sending section on bip47

const a: Buffer = paymentCodeNode.derive(0).privateKey as Buffer

console.log(a.toString('hex') == '8d6a8ecd8ee5e0042ad0cb56e3a971c760b5145c3917a8e7beaf0ed92d7a520c');

const B: Buffer = bobPublicDepositNode.publicKey

console.log(B.toString('hex') == '024ce8e3b04ea205ff49f529950616c3db615b1e37753858cc60c1ce64d17e2ad8');

const SUint: Uint8Array = ecc.xOnlyPointFromPoint(ecc.pointMultiply(B, a, true) as Uint8Array) as Uint8Array;
const S: Buffer = Buffer.alloc(32);
for (let i = 0; i < S.length; i++) S[i] = SUint[i]

console.log(S.toString('hex') == 'f5bb84706ee366052471e6139e6a9a969d586e5fe6471a9b96c3d8caefe86fef');

const s: Buffer = bitcoin.crypto.sha256(S)
console.log(s.toString('hex') == 'd24366e662da47c0cccca4cc2d2d817af54e4d21039c0cc4fc441624efe273f7')

console.log(ecc.isXOnlyPoint(s)) // important to check

const sG: Buffer = ecc.pointMultiply(G, s, true) as Buffer;

const BPrime: Uint8Array = ecc.pointAdd(B, sG, true) as Uint8Array;

const BPrimeBuffer: Buffer = Buffer.alloc(33);
for (let i =0 ;i < BPrimeBuffer.length; i ++)
    BPrimeBuffer[i] = BPrime[i];

console.log(bitcoin.payments.p2pkh({ pubkey: BPrimeBuffer, network:network.network }).address)
