import * as bitcoin from 'bitcoinjs-lib';
import { Network } from 'bitcoinjs-lib';
import {
  BIP32Interface,
  TinySecp256k1Interface as TinySecp256k1InterfaceBIP32,
} from 'bip32';

export type NetworkCoin = {
  network: Network;
  coin: string;
};

export interface PublicKeyOutpoint {
  pubKey: Buffer;
  outpoint: Buffer;
  privKey?: Buffer;
}

export interface TinySecp256k1Interface extends TinySecp256k1InterfaceBIP32 {
  privateAdd(d: Uint8Array, tweak: Uint8Array): Uint8Array | null;

  pointMultiply(
    p: Uint8Array,
    tweak: Uint8Array,
    compressed?: boolean,
  ): Uint8Array | null;

  pointAdd(
    pA: Uint8Array,
    pB: Uint8Array,
    compressed?: boolean,
  ): Uint8Array | null;
}

export interface BIP47Interface {
  network: NetworkCoin;
  RootPaymentCodeNode: BIP32Interface;

  getPaymentWallet(
    bobsRootPaymentCodeNode: BIP32Interface,
    index: number,
  ): BIP32Interface;

  getPaymentCodeNode(): BIP32Interface;

  getPaymentAddress(
    bobsRootPaymentCodeNode: BIP32Interface,
    index: number,
  ): string;

  getSerializedPaymentCode(): string;

  getBinaryPaymentCode(): Buffer;

  getNotificationNode(): BIP32Interface;

  getNotificationNodeFromPaymentCode(paymentCode: string): BIP32Interface;

  getNotificationAddressFromPaymentCode(paymentCode: string): string;

  getNotificationAddress(): string;

  getAddressFromNode(node: BIP32Interface, network: NetworkCoin): string;

  getBlindedPaymentCode(
    bobBIP47: BIP47Interface,
    privateKey: string | Buffer,
    outpoint: string | Buffer,
  ): string;

  getFirstExposedPubKeyAndOutpoint(tx: bitcoin.Transaction): PublicKeyOutpoint;

  getPaymentCodeFromRawNotificationTransaction(
    rawHexNotificationData: string,
  ): string;
}

export interface BIP47API {
  fromSeedHex(seedHex: string | Buffer, network?: NetworkCoin): BIP47Interface;

  fromBip39Seed(
    bip39Seed: string,
    network?: NetworkCoin,
    password?: string,
  ): BIP47Interface;

  fromPaymentCode(paymentCode: string, network?: NetworkCoin): BIP47Interface;
}
