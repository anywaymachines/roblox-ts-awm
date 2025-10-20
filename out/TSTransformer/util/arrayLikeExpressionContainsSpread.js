"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayLikeExpressionContainsSpread = arrayLikeExpressionContainsSpread;
const typescript_1 = __importDefault(require("typescript"));
function arrayLikeExpressionContainsSpread(exp) {
    for (const element of exp.elements) {
        if ((typescript_1.default.isBindingElement(element) && element.dotDotDotToken) || typescript_1.default.isSpreadElement(element))
            return true;
        if (typescript_1.default.isArrayBindingPattern(element) && arrayLikeExpressionContainsSpread(element))
            return true;
    }
    return false;
}
//# sourceMappingURL=arrayLikeExpressionContainsSpread.js.map