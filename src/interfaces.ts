import { Network } from "bitcoinjs-lib";

export type NetworkCoin = {
    'network': Network,
    'coin': string
}

export interface PubkeyOutpoint {
    'pubKey': Buffer,
    'outpoint': Buffer,
    'privKey'?: Buffer
}