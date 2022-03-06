import { BIP32Interface } from "bip32";
import { expect } from "chai";
import { Bip47Util } from "../src";

let alice = {
    'seedPhrase': 'response seminar brave tip suit recall often sound stick owner lottery motion',
    'seedHex': '64dca76abc9c6f0cf3d212d248c380c4622c8f93b2c425ec6a5567fd5db57e10d3e6f94a2f6af4ac2edb8998072aad92098db73558c323777abf5bd1082d970a',
    'paymentCode': 'PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA',
    'notificationAddress': '1JDdmqFLhpzcUwPeinhJbUPw4Co3aWLyzW',
    'privateKey': 'Kx983SRhAZpAhj7Aac1wUXMJ6XZeyJKqCxJJ49dxEbYCT4a1ozRD',   // private key of outpoint used to send notification transaction to bob
    'outpoint': '86f411ab1c8e70ae8a0795ab7a6757aea6e4d5ae1826fc7b8f00c597d500609c01000000',  // used to send the notification transaction
    'blindedPaymentCode': '010002063e4eb95e62791b06c50e1a3a942e1ecaaa9afbbeb324d16ae6821e091611fa96c0cf048f607fe51a0327f5e2528979311c78cb2de0d682c61e1180fc3d543b00000000000000000000000000', // blinded payment code - bob should be able to decode this
}

let bob = {
    'seedPhrase': 'reward upper indicate eight swift arch injury crystal super wrestle already dentist',
    'seedHex': '87eaaac5a539ab028df44d9110defbef3797ddb805ca309f61a69ff96dbaa7ab5b24038cf029edec5235d933110f0aea8aeecf939ed14fc20730bba71e4b1110',
    'paymentCode': 'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
    'notificationAddress': '1ChvUUvht2hUQufHBXF8NgLhW8SwE2ecGV',
}

let aliceToBobAddresses = [
    "141fi7TY3h936vRUKh1qfUZr8rSBuYbVBK",
    "12u3Uued2fuko2nY4SoSFGCoGLCBUGPkk6",
    "1FsBVhT5dQutGwaPePTYMe5qvYqqjxyftc",
    "1CZAmrbKL6fJ7wUxb99aETwXhcGeG3CpeA",
    "1KQvRShk6NqPfpr4Ehd53XUhpemBXtJPTL",
    "1KsLV2F47JAe6f8RtwzfqhjVa8mZEnTM7t",
    "1DdK9TknVwvBrJe7urqFmaxEtGF2TMWxzD",
    "16DpovNuhQJH7JUSZQFLBQgQYS4QB9Wy8e",
    "17qK2RPGZMDcci2BLQ6Ry2PDGJErrNojT5",
    "1GxfdfP286uE24qLZ9YRP3EWk2urqXgC4s",
]

let privateKeysAliceToBobWallets = [
    "04448fd1be0c9c13a5ca0b530e464b619dc091b299b98c5cab9978b32b4a1b8b",
    "6bfa917e4c44349bfdf46346d389bf73a18cec6bc544ce9f337e14721f06107b",
    "46d32fbee043d8ee176fe85a18da92557ee00b189b533fce2340e4745c4b7b8c",
    "4d3037cfd9479a082d3d56605c71cbf8f38dc088ba9f7a353951317c35e6c343",
    "97b94a9d173044b23b32f5ab64d905264622ecd3eafbe74ef986b45ff273bbba",
    "ce67e97abf4772d88385e66d9bf530ee66e07172d40219c62ee721ff1a0dca01",
    "ef049794ed2eef833d5466b3be6fe7676512aa302afcde0f88d6fcfe8c32cc09",
    "d3ea8f780bed7ef2cd0e38c5d943639663236247c0a77c2c16d374e5a202455b",
    "efb86ca2a3bad69558c2f7c2a1e2d7008bf7511acad5c2cbf909b851eb77e8f3",
    "18bcf19b0b4148e59e2bba63414d7a8ead135a7c2f500ae7811125fb6f7ce941",
]


describe("Payment codes and notification addresses", () => {
    it("Should create payment code from seed phrase", () => {
        let bip47 = Bip47Util.fromBip39Seed(alice.seedPhrase)
        expect(bip47.getSerializedPaymentCode() == alice.paymentCode);
    })
    it("Should create payment code from seed hex", () => {
        let bip47 = Bip47Util.fromSeedHex(alice.seedHex)
        expect(bip47.getSerializedPaymentCode() == alice.paymentCode);
    })
    it("should create Bip47 util object from base58 payment code", () => {
        let bip47 = Bip47Util.fromPaymentCode(bob.paymentCode);
        expect(bip47.getSerializedPaymentCode() == bob.paymentCode);
    })
    it("should get notification address from seed phrase or seed)", () => {
        let bip47 = Bip47Util.fromBip39Seed(alice.seedPhrase);
        expect(bip47.getNotificationAddress() == alice.notificationAddress);
    })
    it("should get notification address from payment code", () => {
        let bip47 = Bip47Util.fromPaymentCode(bob.paymentCode);
        expect(bip47.getNotificationAddress() == bob.notificationAddress);
    })

})

describe("Payment Addresses and Private keys", () => {
    it("should generate alice to bob payment addresses from Alice's node", () => {
        let aliceBip47 = Bip47Util.fromBip39Seed(alice.seedPhrase);
        let bobBip47 = Bip47Util.fromPaymentCode(bob.paymentCode);
        let bobPaymentCodeNode: BIP32Interface = bobBip47.getPaymentCodeNode();

        for (let i = 0; i < aliceToBobAddresses.length; i++)
            expect(aliceBip47.getPaymentAddress(bobPaymentCodeNode, i))

    })
    it("Should generate alice to bob payment addresses and private keys from Bob's node", () => {
        let bobBip47 = Bip47Util.fromBip39Seed(bob.seedPhrase);
        let aliceBip47 = Bip47Util.fromPaymentCode(alice.paymentCode);
        let alicePaymentNode: BIP32Interface = aliceBip47.getPaymentCodeNode();

        for (let i = 0; i < privateKeysAliceToBobWallets.length; i++) {
            let wallet: BIP32Interface = bobBip47.getPaymentWallet(alicePaymentNode, i)
            expect(privateKeysAliceToBobWallets[i] == wallet.privateKey?.toString('hex'))
        }
    })
})