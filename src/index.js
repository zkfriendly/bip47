"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainnetData = exports.testnetData = exports.BIP47Factory = exports.default = void 0;
var bip47_1 = require("./bip47");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return bip47_1.BIP47Factory; } });
Object.defineProperty(exports, "BIP47Factory", { enumerable: true, get: function () { return bip47_1.BIP47Factory; } });
var networks_1 = require("./networks");
Object.defineProperty(exports, "testnetData", { enumerable: true, get: function () { return networks_1.testnetData; } });
Object.defineProperty(exports, "mainnetData", { enumerable: true, get: function () { return networks_1.mainnetData; } });
