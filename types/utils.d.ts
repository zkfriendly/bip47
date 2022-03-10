/// <reference types="node" />
import { NetworkCoin, TinySecp256k1Interface } from './interfaces';
import { BIP32API, BIP32Interface } from 'bip32';
export default function getUtils(ecc: TinySecp256k1Interface, bip32: BIP32API): {
    getPublicPaymentCodeNodeFromBase58: (paymentCode: string, network: NetworkCoin) => BIP32Interface;
    getRootPaymentCodeNodeFromSeedHex: (seedHex: string | Buffer, network?: NetworkCoin) => BIP32Interface;
    getRootPaymentCodeNodeFromBIP39Seed: (bip39Seed: string, network?: NetworkCoin, password?: string | undefined) => BIP32Interface;
    uintArrayToBuffer: (array: Uint8Array) => Buffer;
    getSharedSecret: (B: Buffer, a: Buffer) => Buffer;
};
