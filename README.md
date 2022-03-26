# BIP-47 Reusable Payment Codes

A [BIP47](https://github.com/bitcoin/bips/blob/master/bip-0047.mediawiki) compatible library written in TypeScript with transpiled JavaScript committed to git.

## Examples
typescript

```typescript
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import BIP47Factory from '../ts-src';
// You must wrap a tiny-secp256k1 compatible implementation
const ECPair = ECPairFactory(ecc);


// bip47 from seed phrase
let aliceBip47 = BIP47Factory(ecc).fromBip39Seed("response seminar brave tip suit recall often sound stick owner lottery motion");

// base58 payment code
let alicePaymentCode = bip47.getSerializedPaymentCode()

// P2PKH notification address
let aliceNotificationAddress = bip47.getNotificationAddress()


// bip47 from payment code
let bopBip47 = BIP47Factory(ecc).fromPaymentCode("PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97");


```


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

[paynym.is/+frostydarkness08a](https://paynym.is/+frostydarkness08a)
