import * as bitcoin from 'bitcoinjs-lib';
import { Network } from 'bitcoinjs-lib';
import { BIP32Interface } from 'bip32';
import { BIP47 } from './bip47';

export type NetworkCoin = {
  network: Network;
  coin: string;
};

export interface PublicKeyOutpoint {
  pubKey: Buffer;
  outpoint: Buffer;
  privKey?: Buffer;
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
    bobBIP47: BIP47,
    privateKey: string | Buffer,
    outpoint: string | Buffer,
  ): string;

  getFirstExposedPubKeyAndOutpoint(tx: bitcoin.Transaction): PublicKeyOutpoint;

  getPaymentCodeFromRawNotificationTransaction(
    rawHexNotificationData: string,
  ): string;
}
