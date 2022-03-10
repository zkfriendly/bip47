/// <reference types="node" />
import { NetworkCoin, TinySecp256k1Interface } from './interfaces';
import { BIP32Interface } from 'bip32';
export declare const getPublicPaymentCodeNodeFromBase58: (ecc: TinySecp256k1Interface, paymentCode: string, network: NetworkCoin) => BIP32Interface;
export declare const getRootPaymentCodeNodeFromSeedHex: (ecc: TinySecp256k1Interface, seedHex: string | Buffer, network?: NetworkCoin) => BIP32Interface;
export declare const getRootPaymentCodeNodeFromBIP39Seed: (ecc: TinySecp256k1Interface, bip39Seed: string, network?: NetworkCoin, password?: string | undefined) => BIP32Interface;
export declare const uintArrayToBuffer: (array: Uint8Array) => Buffer;
export declare const getSharedSecret: (ecc: TinySecp256k1Interface, B: Buffer, a: Buffer) => Buffer;
