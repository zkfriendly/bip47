import BIP32Factory, { BIP32API, BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from './crypto';
import { xor } from './xor';

import {
  BIP47API,
  BIP47Interface,
  NetworkCoin,
  PublicKeyOutpoint,
  TinySecp256k1Interface,
} from './interfaces';
import { mainnetData } from './networks';
import getUtils from './utils';
const bs58check = require('bs58check');

export function BIP47Factory(ecc: TinySecp256k1Interface): BIP47API {
  // TODO: implement a test assertion function for ecc

  const bip32: BIP32API = BIP32Factory(ecc);

  const G: Buffer = Buffer.from(
    '0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798',
    'hex',
  );
  const {
    getPublicPaymentCodeNodeFromBase58,
    getRootPaymentCodeNodeFromSeedHex,
    getRootPaymentCodeNodeFromBIP39Seed,
    uintArrayToBuffer,
    getSharedSecret,
    toInternalByteOrder,
  } = getUtils(ecc, bip32);

  class BIP47 implements BIP47Interface {
    network: NetworkCoin;
    RootPaymentCodeNode: BIP32Interface;

    constructor(network: NetworkCoin, RootPaymentCodeNode: BIP32Interface) {
      this.network = network;
      this.RootPaymentCodeNode = RootPaymentCodeNode;
    }

    getPaymentWallet(aliceNode: BIP32Interface, index: number): BIP32Interface {
      if (!this.network || !this.RootPaymentCodeNode)
        throw new Error('Root Payment code node or network not set');

      const bobNode: BIP32Interface = this.RootPaymentCodeNode.derive(index);

      if (bobNode.privateKey === undefined)
        throw new Error('Missing private key to generate payment wallets');

      const firstAliceNode: BIP32Interface = aliceNode.derive(0);
      const s: Buffer = getSharedSecret(
        firstAliceNode.publicKey,
        bobNode.privateKey,
      );
      const prvKeyUint8: Uint8Array | null = ecc.privateAdd(
        bobNode.privateKey,
        s,
      );

      if (prvKeyUint8 === null)
        throw new Error('Could not calculate private key');

      const prvKey: Buffer = uintArrayToBuffer(prvKeyUint8);
      return bip32.fromPrivateKey(
        prvKey,
        bobNode.chainCode,
        this.network.network,
      );
    }

    getReceiveWallet(bobNode: BIP32Interface, index: number): BIP32Interface {
      if (!this.network || !this.RootPaymentCodeNode)
        throw new Error('Root Payment code node or network not set');

      const aliceNode = this.RootPaymentCodeNode.derive(0);

      bobNode = bobNode.derive(index);

      if (aliceNode.privateKey === undefined)
        throw new Error('Missing private key to generate receive wallets');

      const s = getSharedSecret(bobNode.publicKey, aliceNode.privateKey);

      const sG = ecc.pointMultiply(G, s, true);

      if (sG === null) throw new Error('Could not calculate private key');

      const pubKeyUint8 = ecc.pointAdd(bobNode.publicKey, sG);

      if (pubKeyUint8 === null) throw new Error('Could not sum pub keys');

      const pubKey = uintArrayToBuffer(pubKeyUint8);
      return bip32.fromPublicKey(
        pubKey,
        bobNode.chainCode,
        this.network.network,
      );
    }

    getPaymentCodeNode(): BIP32Interface {
      return this.RootPaymentCodeNode as BIP32Interface;
    }

    getPaymentAddress(
      bobsRootPaymentCodeNode: BIP32Interface,
      index: number,
    ): string {
      if (!this.network || !this.RootPaymentCodeNode)
        throw new Error('Root Payment code or network not set');
      const firstAlicePaymentCodeNode: BIP32Interface =
        this.RootPaymentCodeNode.derive(0);
      const bobPaymentCodeNode: BIP32Interface =
        bobsRootPaymentCodeNode.derive(index);

      if (firstAlicePaymentCodeNode.privateKey === undefined)
        throw new Error('Missing private key to generate payment address');

      const a: Buffer = firstAlicePaymentCodeNode.privateKey;
      const B: Buffer = bobPaymentCodeNode.publicKey;
      const s = getSharedSecret(B, a);
      const sGUint: Uint8Array | null = ecc.pointMultiply(G, s, true);

      if (sGUint === null) throw new Error('Could not compute sG');

      const sG: Buffer = uintArrayToBuffer(sGUint);
      const BPrimeUint: Uint8Array | null = ecc.pointAdd(B, sG, true);

      if (BPrimeUint === null) throw new Error('Could not calculate pubkey');

      const BPrime: Buffer = uintArrayToBuffer(BPrimeUint);

      if (!ecc.isPoint(BPrime)) throw new Error('Calculate Pubkey is invalid');

      const node: BIP32Interface = bip32.fromPublicKey(
        BPrime,
        bobPaymentCodeNode.chainCode,
        this.network.network,
      );
      return this.getAddressFromNode(node);
    }

    getSerializedPaymentCode(): string {
      return bs58check.encode(
        Buffer.concat([Buffer.from([71]), this.getBinaryPaymentCode()]),
      );
    }

    getBinaryPaymentCode(): Buffer {
      if (!this.network || !this.RootPaymentCodeNode)
        throw new Error('Root Payment code or network not set');
      const node = this.RootPaymentCodeNode;
      const paymentCodeSerializedBuffer: Buffer = Buffer.alloc(80);
      paymentCodeSerializedBuffer[0] = 0x01; // version
      paymentCodeSerializedBuffer[1] = 0x00; // must be zero
      paymentCodeSerializedBuffer[2] = node.publicKey[0]; // sign 2 or 3
      paymentCodeSerializedBuffer.fill(node.publicKey.slice(1), 3, 35); // pubkey
      paymentCodeSerializedBuffer.fill(node.chainCode, 35, 67); // chain code
      return paymentCodeSerializedBuffer;
    }

    getNotificationNode(): BIP32Interface {
      if (!this.network || !this.RootPaymentCodeNode)
        throw new Error('Root Payment code or network not set');
      return this.RootPaymentCodeNode.derive(0);
    }

    getNotificationNodeFromPaymentCode(paymentCode: string): BIP32Interface {
      if (!this.network || !this.RootPaymentCodeNode)
        throw new Error('Root Payment code or network not set');
      return getPublicPaymentCodeNodeFromBase58(paymentCode, this.network);
    }

    getNotificationAddressFromPaymentCode(paymentCode: string): string {
      return this.getAddressFromNode(
        this.getNotificationNodeFromPaymentCode(paymentCode),
      );
    }

    getNotificationAddress(): string {
      return this.getAddressFromNode(this.getNotificationNode());
    }

    getAddressFromNode(node: BIP32Interface, network = this.network): string {
      return bitcoin.payments.p2pkh({
        pubkey: node.publicKey,
        network: network?.network,
      }).address!;
    }

    getBlindedPaymentCode(
      bobBIP47: BIP47,
      privateKey: string | Buffer,
      outpoint: string | Buffer,
    ): string {
      if (!this.network || !this.RootPaymentCodeNode)
        throw new Error('Root Payment code or network not set');

      if (typeof privateKey === 'string')
        privateKey = Buffer.from(privateKey, 'hex');

      if (typeof outpoint === 'string') outpoint = Buffer.from(outpoint, 'hex');

      const a: Buffer = privateKey;
      const B: Buffer = bobBIP47.getNotificationNode().publicKey;
      const S: Buffer = uintArrayToBuffer(ecc.pointMultiply(B, a) as Buffer);

      const x: Buffer = uintArrayToBuffer(S.slice(1, 33));
      const o: Buffer = outpoint;
      const s = crypto.hmacSHA512(o, x);

      const binaryPaymentCode: Buffer = this.getBinaryPaymentCode();
      binaryPaymentCode.fill(
        xor(s.slice(0, 32), binaryPaymentCode.slice(3, 35)),
        3,
        35,
      );
      binaryPaymentCode.fill(
        xor(s.slice(32, 64), binaryPaymentCode.slice(35, 67)),
        35,
        67,
      );

      return binaryPaymentCode.toString('hex');
    }

    getFirstExposedPubKeyAndOutpoint(
      tx: bitcoin.Transaction,
    ): PublicKeyOutpoint {
      const first: bitcoin.TxInput = tx.ins[0];
      const hash: Buffer = first.hash;
      const index: number = first.index;
      const indexHex = this.getInternalByteOrderHex(index);
      const outpoint = Buffer.from(hash.toString('hex') + indexHex, 'hex');

      let pubKey: Buffer | null = null;

      if (first.witness.length) pubKey = first.witness[1];
      else if (bitcoin.script.toASM(first.script).split(' ').length === 2)
        pubKey = Buffer.from(
          bitcoin.script.toASM(first.script).split(' ')[1],
          'hex',
        );
      else throw new Error('Unknown Transaction type');

      return {
        outpoint,
        pubKey,
      };
    }

    private getInternalByteOrderHex(index: number) {
      const tmpIndex = index.toString(16).padStart(8, '0');
      const indexBuffer = toInternalByteOrder(Buffer.from(tmpIndex, 'hex'));
      const indexHex = indexBuffer.toString('hex');
      return indexHex;
    }

    getPaymentCodeFromRawNotificationTransaction(
      rawHexNotificationData: string,
    ) {
      const tx: bitcoin.Transaction = bitcoin.Transaction.fromHex(
        rawHexNotificationData,
      );
      // tslint:disable-next-line:prefer-const
      let { pubKey, outpoint } = this.getFirstExposedPubKeyAndOutpoint(tx);

      const A: Buffer = pubKey;
      const b: Buffer = this.getNotificationNode().privateKey as Buffer;
      const S: Buffer = uintArrayToBuffer(ecc.pointMultiply(A, b) as Buffer);
      const x: Buffer = uintArrayToBuffer(S.slice(1, 33));
      const s = crypto.hmacSHA512(outpoint, x);

      const opReturnOutput = tx.outs.find((o) =>
        o.script.toString('hex').startsWith('6a4c50'),
      );

      if (!opReturnOutput)
        throw new Error('No OP_RETURN output in notification');

      const binaryPaymentCode: Buffer = opReturnOutput.script.slice(3);

      binaryPaymentCode.fill(
        xor(s.slice(0, 32), binaryPaymentCode.slice(3, 35)),
        3,
        35,
      );
      binaryPaymentCode.fill(
        xor(s.slice(32, 64), binaryPaymentCode.slice(35, 67)),
        35,
        67,
      );

      return bs58check.encode(
        Buffer.concat([Buffer.from([71]), binaryPaymentCode]),
      );
    }
  }

  function fromPaymentCode(
    paymentCode: string,
    network: NetworkCoin = mainnetData,
  ): BIP47Interface {
    return new BIP47(
      network,
      getPublicPaymentCodeNodeFromBase58(paymentCode, network),
    );
  }

  function fromBip39Seed(
    bip39Seed: string,
    network: NetworkCoin = mainnetData,
    password?: string,
  ): BIP47Interface {
    return new BIP47(
      network,
      getRootPaymentCodeNodeFromBIP39Seed(bip39Seed, network, password),
    );
  }

  function fromSeedHex(
    seedHex: string | Buffer,
    network: NetworkCoin = mainnetData,
  ): BIP47Interface {
    return new BIP47(
      network,
      getRootPaymentCodeNodeFromSeedHex(seedHex, network),
    );
  }

  return {
    fromSeedHex,
    fromBip39Seed,
    fromPaymentCode,
  };
}
