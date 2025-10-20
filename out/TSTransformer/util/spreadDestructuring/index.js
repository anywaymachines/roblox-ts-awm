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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpreadDestructorForType = getSpreadDestructorForType;
const assert_1 = require("../../../Shared/util/assert");
const spreadDestructureArray_1 = require("./spreadDestructureArray");
const spreadDestructureGenerator_1 = require("./spreadDestructureGenerator");
const spreadDestructureMap_1 = require("./spreadDestructureMap");
const spreadDestructureSet_1 = require("./spreadDestructureSet");
const types_1 = require("../types");
__exportStar(require("./spreadDestructureArray"), exports);
__exportStar(require("./spreadDestructureMap"), exports);
__exportStar(require("./spreadDestructureObject"), exports);
__exportStar(require("./spreadDestructureSet"), exports);
function getSpreadDestructorForType(state, node, type) {
    if ((0, types_1.isDefinitelyType)(type, (0, types_1.isArrayType)(state))) {
        return spreadDestructureArray_1.spreadDestructureArray;
    }
    else if ((0, types_1.isDefinitelyType)(type, (0, types_1.isSetType)(state))) {
        return spreadDestructureSet_1.spreadDestructureSet;
    }
    else if ((0, types_1.isDefinitelyType)(type, (0, types_1.isMapType)(state))) {
        return spreadDestructureMap_1.spreadDestructureMap;
    }
    else if ((0, types_1.isDefinitelyType)(type, (0, types_1.isGeneratorType)(state))) {
        return spreadDestructureGenerator_1.spreadDestructureGenerator;
    }
    return () => {
        (0, assert_1.assert)(false, "Spread Destructuring not supported for type: " + state.typeChecker.typeToString(type));
    };
}
//# sourceMappingURL=index.js.map