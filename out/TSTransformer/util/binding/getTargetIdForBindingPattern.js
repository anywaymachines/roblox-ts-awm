"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTargetIdForBindingPattern = getTargetIdForBindingPattern;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
const typescript_1 = __importDefault(require("typescript"));
function getTargetIdForBindingPattern(state, name, value) {
    return luau_ast_1.default.isAnyIdentifier(value) &&
        name.elements.every(element => typescript_1.default.isOmittedExpression(element) || !element.initializer)
        ? value
        : state.pushToVar(value, "binding");
}
//# sourceMappingURL=getTargetIdForBindingPattern.js.map