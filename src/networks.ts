import { testnet, bitcoin } from 'bitcoinjs-lib/src/networks'
import { NetworkCoin } from './interfaces'

let testnetData: NetworkCoin = {
    'network': testnet,
    'coin': "1"
}
let mainnetData: NetworkCoin = {
    'network': bitcoin,
    'coin': "0"
}

export { testnetData, mainnetData }
