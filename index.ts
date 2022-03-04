import * as bip39 from 'bip39';
import BIP32Factory, {BIP32Interface} from 'bip32';
import * as ecc from 'tiny-secp256k1';
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
let network = network_data_testnet;

// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc);


let bip39Seed: string = "submit enough hand diagram close local rhythm goose path fade almost quick"

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
const paymentCodeSerialized: string = base58check.encode(paymentCodeSerializedBuffer)


function getSharedSecret(B: Buffer, a: Buffer) {
    const SUint: Uint8Array = ecc.xOnlyPointFromPoint(ecc.pointMultiply(B, a, true) as Uint8Array) as Uint8Array;
    const S: Buffer = Buffer.alloc(32);
    for (let i = 0; i < S.length; i++) S[i] = SUint[i]  // uint8Array to Buffer
    return bitcoin.crypto.sha256(S);
}

function getAliceToBobPaymentAddress(aliceMasterPrivatePaymentCodeNode: BIP32Interface,
                                       bobMasterPublicPaymentCodeNode: BIP32Interface,
                                       index: number): Buffer {

    const zerothAlicePaymentCodeNode: BIP32Interface = aliceMasterPrivatePaymentCodeNode.derive(0)
    const currentBobPublicPaymentCodeNode: BIP32Interface = bobMasterPublicPaymentCodeNode.derive(index)

    const a: Buffer = zerothAlicePaymentCodeNode.privateKey as Buffer
    const B: Buffer = currentBobPublicPaymentCodeNode.publicKey
    const s = getSharedSecret(B, a);
    const sG: Buffer = ecc.pointMultiply(G, s, true) as Buffer;
    const BPrime: Uint8Array = ecc.pointAdd(B, sG, true) as Uint8Array;
    const BPrimeBuffer: Buffer = Buffer.alloc(33);
    for (let i = 0; i < BPrimeBuffer.length; i++) BPrimeBuffer[i] = BPrime[i];
    return BPrimeBuffer;
}

function getBobToAliceWalletNode(aliceMasterPrivatePaymentCodeNode: BIP32Interface,
                             bobMasterPublicPaymentCodeNode: BIP32Interface,
                             index: number): BIP32Interface {
    const alicePrivateNode: BIP32Interface = aliceMasterPrivatePaymentCodeNode.derive(index);
    const zerothBobPaymentNode: BIP32Interface = bobMasterPublicPaymentCodeNode.derive(0);
    const s = getSharedSecret(zerothBobPaymentNode.publicKey, alicePrivateNode.privateKey as Buffer);
    if (!ecc.isPrivate(s))
        throw new TypeError('Invalid shared secret');
    const prvKeyUint = ecc.privateAdd(alicePrivateNode.privateKey as Buffer, s) as Buffer;
    const prvKey: Buffer = Buffer.alloc(32);
    for (let i = 0 ; i < prvKey.length;i++) prvKey[i] = prvKeyUint[i]
    return bip32.fromPrivateKey(prvKey, zerothBobPaymentNode.chainCode, network.network);
}

// generate sending addresses
// for (let index = 0; index < 10; index ++) {
//     const bobPaymentCodeBuffer: Buffer = base58check.decode("PM8TJaz19chXNgWBbuFyFJQqjTAMpAffgGkAXZZsSCkxVCSBJtqju3v26BSU98WkmhurgoBTyJfhckPzBGnjaXoCkjzg7u6gaAq8nbDUTbhFnuYNMLhf")
//     const bobPublicKeyNode: BIP32Interface = bip32.fromPublicKey(bobPaymentCodeBuffer.slice(3, 36), bobPaymentCodeBuffer.slice(36, 68))
// //
//     let BPrimeBuffer: Buffer = getAliceToBobPaymentAddress(paymentCodeNode, bobPublicKeyNode, index);
//     console.log(bitcoin.payments.p2pkh({pubkey: BPrimeBuffer, network: network.network}).address);
// }

const bobPaymentCodeBuffer: Buffer = base58check.decode("PM8TJaz19chXNgWBbuFyFJQqjTAMpAffgGkAXZZsSCkxVCSBJtqju3v26BSU98WkmhurgoBTyJfhckPzBGnjaXoCkjzg7u6gaAq8nbDUTbhFnuYNMLhf")
const bobPublicKeyNode: BIP32Interface = bip32.fromPublicKey(bobPaymentCodeBuffer.slice(3, 36), bobPaymentCodeBuffer.slice(36, 68))
console.log(getAddress(getBobToAliceWalletNode(paymentCodeNode, bobPublicKeyNode, 1), network.network));
console.log(getBobToAliceWalletNode(paymentCodeNode, bobPublicKeyNode, 1).toWIF());
