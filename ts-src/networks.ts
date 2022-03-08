import { testnet, bitcoin } from 'bitcoinjs-lib/src/networks'
import { NetworkCoin } from './interfaces'

const testnetData: NetworkCoin = {
    'network': testnet,
    'coin': '1'
}
const mainnetData: NetworkCoin = {
    'network': bitcoin,
    'coin': '0'
}

export { testnetData, mainnetData }
