# BIP-47 Reusable Payment Codes

A [BIP47](https://github.com/bitcoin/bips/blob/master/bip-0047.mediawiki) compatible library written in TypeScript with transpiled JavaScript committed to git.

## Examples
typescript

```typescript
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import BIP47Factory from '.';
// You must wrap a tiny-secp256k1 compatible implementation
const ECPair = ECPairFactory(ecc);

const aliceSeedPhrase = 'response seminar brave tip suit recall often sound stick owner lottery motion';
const bobSeedPhrase = 'reward upper indicate eight swift arch injury crystal super wrestle already dentist';
const bobPaymentCode = 'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';

// alice private bip47
const aliceBip47 = BIP47Factory(ecc).fromBip39Seed(aliceSeedPhrase);

// base58 payment code
const alicePaymentCode = aliceBip47.getSerializedPaymentCode();

// P2PKH notification address
const aliceNotificationAddress = aliceBip47.getNotificationAddress();

// bip47 from payment code
const bobPublicBip47 = BIP47Factory(ecc).fromPaymentCode(bobPaymentCode);

// third payment address from alice to bob
const paymentAddress = aliceBip47.getPaymentAddress(bobPublicBip47.getPaymentCodeNode(), 2);

// bob private bip47
const bobPrivateBip47 = BIP47Factory(ecc).fromBip39Seed(bobSeedPhrase);

// third alice to bob wallet (bip32)
const wallet = bobPrivateBip47.getPaymentWallet(aliceBip47.getPaymentCodeNode(), 2);

// third wallet private key
const privateKey = wallet.privateKey?.toString('hex');

// examples of how to generate blinded payment code
// and retrieving payment code from notification transaction
// can be found in tests

```

see tests for more examples.


## Supported Functionality
- generate payment code from seed phrase or seed hex
- generate payment addresses
- generate notification address from payment code
- generate receiving addresses/privateKeys for a payment code
- generate blinded payment code for notification transaction
- retrieve payment code from raw notification transaction


## Reference
[BIP-47](https://github.com/bitcoin/bips/blob/master/bip-0047.mediawiki)

[BIP-47 Test Vectors](https://gist.github.com/SamouraiDev/6aad669604c5930864bd)

## Donations
We appreciate your donations if you found this repository useful :)
- btc: `bc1qujem059ce55c2uwusrtv97e26ulmz43w3cz6gn`
- payment code: `PM8TJLSPLroADRS1hJafJEUmRvuXZpE2YmRrfHT1LrYmQW6t4ZxtP73sjh5qUmxMMrpsioFHxaHFpGgkHz5Ubidyzc1orYjcAWYzdA71RVZshdytY67m`
