"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bip39 = __importStar(require("bip39"));
let sampleSeed = "submit enough hand diagram close local rhythm goose path fade almost quick";
let seed = bip39.mnemonicToSeedSync('basket actual');
let seed2 = [...seed];
let seedHex = [...seed].map((b) => Number(b).toString(16)).join('');
console.log(seedHex);
// extended private and public key are required
// Each extended key has 2^31 normal child keys, and 2^31 hardened child keys. 
// Each of these child keys has an index. The normal child keys use indices 0 through 2^(31)-1. 
// The hardened child keys use indices 2^31 through 2^(32)-1
