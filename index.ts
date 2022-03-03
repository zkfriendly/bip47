import * as bip39 from 'bip39';

let sampleSeed: String = "submit enough hand diagram close local rhythm goose path fade almost quick"

let seed: Uint8Array = bip39.mnemonicToSeedSync('basket actual')
let seed2 = [...seed]

let seedHex: String = [...seed].map((b) => Number(b).toString(16)).join('');

// extended private and public key are required
// Each extended key has 2^31 normal child keys, and 2^31 hardened child keys. 
// Each of these child keys has an index. The normal child keys use indices 0 through 2^(31)-1. 
// The hardened child keys use indices 2^31 through 2^(32)-1

