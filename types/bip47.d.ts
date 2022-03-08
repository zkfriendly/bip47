/// <reference types="node" />
import { BIP32API, BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import { BIP47Interface, NetworkCoin, PublicKeyOutpoint } from './interfaces';
export declare class BIP47 implements BIP47Interface {
    static G: Buffer;
    static bip32: BIP32API;
    network: NetworkCoin;
    RootPaymentCodeNode: BIP32Interface;
    constructor(network: NetworkCoin, RootPaymentCodeNode: BIP32Interface);
    static fromPaymentCode(paymentCode: string, network?: NetworkCoin): BIP47;
    static fromBip39Seed(bip39Seed: string, network?: NetworkCoin, password?: string): BIP47;
    static fromSeedHex(seedHex: string | Buffer, network?: NetworkCoin): BIP47;
    getPaymentWallet(bobsRootPaymentCodeNode: BIP32Interface, index: number): BIP32Interface;
    getPaymentCodeNode(): BIP32Interface;
    getPaymentAddress(bobsRootPaymentCodeNode: BIP32Interface, index: number): string;
    getSerializedPaymentCode(): string;
    getBinaryPaymentCode(): Buffer;
    getNotificationNode(): BIP32Interface;
    getNotificationNodeFromPaymentCode(paymentCode: string): BIP32Interface;
    getNotificationAddressFromPaymentCode(paymentCode: string): string;
    getNotificationAddress(): string;
    getAddressFromNode(node: BIP32Interface, network?: NetworkCoin): string;
    getBlindedPaymentCode(bobBIP47: BIP47, privateKey: string | Buffer, outpoint: string | Buffer): string;
    getFirstExposedPubKeyAndOutpoint(tx: bitcoin.Transaction): PublicKeyOutpoint;
    getPaymentCodeFromRawNotificationTransaction(rawHexNotificationData: string): string;
}
