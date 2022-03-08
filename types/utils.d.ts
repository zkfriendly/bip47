/// <reference types="node" />
import { NetworkCoin } from './interfaces';
import { BIP32Interface } from 'bip32';
export declare const getPublicPaymentCodeNodeFromBase58: (paymentCode: string, network: NetworkCoin) => BIP32Interface;
export declare const getRootPaymentCodeNodeFromSeedHex: (seedHex: string | Buffer, network?: NetworkCoin) => BIP32Interface;
export declare const getRootPaymentCodeNodeFromBIP39Seed: (bip39Seed: string, network?: NetworkCoin, password?: string | undefined) => BIP32Interface;
export declare const uintArrayToBuffer: (array: Uint8Array) => Buffer;
export declare const getSharedSecret: (B: Buffer, a: Buffer) => Buffer;
