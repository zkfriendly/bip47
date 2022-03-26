import { BIP32Interface } from 'bip32';
import { expect } from 'chai';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import BIP47Factory from '../ts-src';

const ECPair = ECPairFactory(ecc);

const alice = {
  seedPhrase:
    'response seminar brave tip suit recall often sound stick owner lottery motion',
  seedHex:
    '64dca76abc9c6f0cf3d212d248c380c4622c8f93b2c425ec6a5567fd5db57e10d3e6f94a2f6af4ac2edb8998072aad92098db73558c323777abf5bd1082d970a',
  paymentCode:
    'PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA',
  notificationAddress: '1JDdmqFLhpzcUwPeinhJbUPw4Co3aWLyzW',
  privateKeyWIF: 'Kx983SRhAZpAhj7Aac1wUXMJ6XZeyJKqCxJJ49dxEbYCT4a1ozRD', // private key of outpoint used to send notification transaction to bob
  outpoint:
    '86f411ab1c8e70ae8a0795ab7a6757aea6e4d5ae1826fc7b8f00c597d500609c01000000', // used to send the notification transaction
  blindedPaymentCode:
    '010002063e4eb95e62791b06c50e1a3a942e1ecaaa9afbbeb324d16ae6821e091611fa96c0cf048f607fe51a0327f5e2528979311c78cb2de0d682c61e1180fc3d543b00000000000000000000000000', // blinded payment code - bob should be able to decode this
};

const bob = {
  seedPhrase:
    'reward upper indicate eight swift arch injury crystal super wrestle already dentist',
  seedHex:
    '87eaaac5a539ab028df44d9110defbef3797ddb805ca309f61a69ff96dbaa7ab5b24038cf029edec5235d933110f0aea8aeecf939ed14fc20730bba71e4b1110',
  paymentCode:
    'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
  notificationAddress: '1ChvUUvht2hUQufHBXF8NgLhW8SwE2ecGV',
};

const aliceToBobRawNotificationHex =
  '010000000186f411ab1c8e70ae8a0795ab7a6757aea6e4d5ae1826fc7b8f00c597d500609c010000006b483045022100ac8c6dbc482c79e86c18928a8b364923c774bfdbd852059f6b3778f2319b59a7022029d7cc5724e2f41ab1fcfc0ba5a0d4f57ca76f72f19530ba97c860c70a6bf0a801210272d83d8a1fa323feab1c085157a0791b46eba34afb8bfbfaeb3a3fcc3f2c9ad8ffffffff0210270000000000001976a9148066a8e7ee82e5c5b9b7dc1765038340dc5420a988ac1027000000000000536a4c50010002063e4eb95e62791b06c50e1a3a942e1ecaaa9afbbeb324d16ae6821e091611fa96c0cf048f607fe51a0327f5e2528979311c78cb2de0d682c61e1180fc3d543b0000000000000000000000000000000000';

const aliceToBobAddresses = [
  '141fi7TY3h936vRUKh1qfUZr8rSBuYbVBK',
  '12u3Uued2fuko2nY4SoSFGCoGLCBUGPkk6',
  '1FsBVhT5dQutGwaPePTYMe5qvYqqjxyftc',
  '1CZAmrbKL6fJ7wUxb99aETwXhcGeG3CpeA',
  '1KQvRShk6NqPfpr4Ehd53XUhpemBXtJPTL',
  '1KsLV2F47JAe6f8RtwzfqhjVa8mZEnTM7t',
  '1DdK9TknVwvBrJe7urqFmaxEtGF2TMWxzD',
  '16DpovNuhQJH7JUSZQFLBQgQYS4QB9Wy8e',
  '17qK2RPGZMDcci2BLQ6Ry2PDGJErrNojT5',
  '1GxfdfP286uE24qLZ9YRP3EWk2urqXgC4s',
];

const privateKeysAliceToBobWallets = [
  'd687f6b820e6e3d47296b01f3b73ccdc930eded39d559921a7dd8ed81b2c8f82',
  'c7a376a4ddc5ca6ecc3822fd06f6c5009911e71ce38e9b1e52bd2aaf735fd505',
  '72ab5f58870e5b24e13c1bedf674e2419bdba319bedeccf5eb4851050fc6feed',
  'e865507797c5f0b8c1b4ade024b2520100a5be8188a0596a34636773d4cd279e',
  '34771c63469338453ed71a5099ed6807386c37d63bfdebdef69658ce71461231',
  '66a2b5d7fd1b89141caf1ee050ff502d61c793e9d2bd28e773771a608408aa5b',
  'f103fe818377ff6040eb9aac10677384bb1ca6ff7f9d33e5a6306c3e402daec9',
  '5bd0be3fa5ae87ea97301b1e637915478efb45afcfe64133954eae93a29553a0',
  '0c4d3825253bc7a28a83097cfaf8affd9924d9a9ac921dbb9ce20a684253d349',
  '118951327db87b267c2ed385631cda9c2905078cff8e63a053dc586d624c7899'
];

describe('Payment codes and notification addresses', () => {
  it('Should create payment code from seed phrase', () => {
    const bip47 = BIP47Factory(ecc).fromBip39Seed(alice.seedPhrase);
    expect(bip47.getSerializedPaymentCode()).to.equal(alice.paymentCode);
  });
  it('Should create payment code from seed hex', () => {
    const bip47 = BIP47Factory(ecc).fromSeedHex(alice.seedHex);
    expect(bip47.getSerializedPaymentCode()).to.equal(alice.paymentCode);
  });
  it('should create Bip47 util object from base58 payment code', () => {
    const bip47 = BIP47Factory(ecc).fromPaymentCode(bob.paymentCode);
    expect(bip47.getSerializedPaymentCode()).to.equal(bob.paymentCode);
  });
  it('should get notification address from seed phrase or seed)', () => {
    const bip47 = BIP47Factory(ecc).fromBip39Seed(alice.seedPhrase);
    expect(bip47.getNotificationAddress()).to.equal(alice.notificationAddress);
  });
  it('should get notification address from payment code', () => {
    const bip47 = BIP47Factory(ecc).fromPaymentCode(bob.paymentCode);
    expect(bip47.getNotificationAddress()).to.equal(bob.notificationAddress);
  });
});

describe('Payment Addresses and Private keys', () => {
  it('should generate alice to bob payment addresses from Alice\'s node', () => {
    const aliceBip47 = BIP47Factory(ecc).fromBip39Seed(alice.seedPhrase);
    const bobBip47 = BIP47Factory(ecc).fromPaymentCode(bob.paymentCode);
    const bobPaymentCodeNode: BIP32Interface = bobBip47.getPaymentCodeNode();

    for (let i = 0; i < aliceToBobAddresses.length; i++)
      expect(aliceBip47.getPaymentAddress(bobPaymentCodeNode, i)).to.equal(aliceToBobAddresses[i]);
  });
  it('Should generate alice to bob payment addresses and private keys from Bob\'s node', () => {
    const bobBip47 = BIP47Factory(ecc).fromBip39Seed(bob.seedPhrase);
    const aliceBip47 = BIP47Factory(ecc).fromPaymentCode(alice.paymentCode);
    const alicePaymentNode: BIP32Interface = aliceBip47.getPaymentCodeNode();

    for (let i = 0; i < privateKeysAliceToBobWallets.length; i++) {
      const wallet: BIP32Interface = bobBip47.getPaymentWallet(
        alicePaymentNode,
        i,
      );
      expect(bobBip47.getAddressFromNode(wallet, bobBip47.network)).to.equal(aliceToBobAddresses[i])
      // check private key
      expect(wallet.privateKey?.toString('hex')).to.equal(privateKeysAliceToBobWallets[i]);
    }
  });
});

describe('Notification Transaction and blinded payment code exchange', () => {
  it('should generate Alice\'s blinded payment code for Bob', () => {
    const aliceBip47 = BIP47Factory(ecc).fromBip39Seed(alice.seedPhrase);
    const bobBip47 = BIP47Factory(ecc).fromPaymentCode(bob.paymentCode);
    const keyPair = ECPair.fromWIF(alice.privateKeyWIF);

    const blindedPaymentCode = aliceBip47.getBlindedPaymentCode(
      bobBip47,
      keyPair.privateKey as Buffer,
      alice.outpoint,
    );
    expect(blindedPaymentCode).to.equal(alice.blindedPaymentCode);
  });

  it('Bob should be able to retrieve Alice\'s payment code, from Alice\'s notification transaction', () => {
    const bobBip47 = BIP47Factory(ecc).fromBip39Seed(bob.seedPhrase);
    const p = bobBip47.getPaymentCodeFromRawNotificationTransaction(
      aliceToBobRawNotificationHex,
    );

    expect(p).to.equal(alice.paymentCode);
  });
});
