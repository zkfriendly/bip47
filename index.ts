import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib'
import base58check from 'bs58check-ts'
import { testnet } from 'bitcoinjs-lib/src/networks';

function bufferToHexString(buffer: Buffer | undefined): String {
    if (buffer !== undefined)
        return [...buffer].map((b) => Number(b).toString(16)).join('');
    return ""
}

function getAddress(node: any, network?: any): string {
    return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address!;
}


let network_data_testnet = {
    'network': bitcoin.networks.testnet,
    'sign': 0x02,
    'coin': "1"
}
let network_data_mainnet = {
    'network': bitcoin.networks.bitcoin,
    'sign': 0x03,
    'coin': "0"
}

// choose network
let network = network_data_mainnet;

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
console.log(getAddress(BIP47NotificationNode, network.network))

// payment code serialize
let paymentCodeSerializedBuffer: Buffer = Buffer.alloc(81);
paymentCodeSerializedBuffer[0] = 71;
paymentCodeSerializedBuffer[1] = 0x01; // version
paymentCodeSerializedBuffer[2] = 0x00; // must be zero
paymentCodeSerializedBuffer[3] = network.sign; // sign 2 or 3
paymentCodeSerializedBuffer.fill(paymentCodeNode.publicKey.slice(1), 4, 36); // pubkey
paymentCodeSerializedBuffer.fill(paymentCodeNode.chainCode, 36, 68); // chain code


const payment = base58check.encode(paymentCodeSerializedBuffer)
console.log(payment)