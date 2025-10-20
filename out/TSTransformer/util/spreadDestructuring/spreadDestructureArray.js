"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadDestructureArray = spreadDestructureArray;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
function spreadDestructureArray(state, parentId, index) {
    return luau_ast_1.default.call(luau_ast_1.default.globals.table.move, [
        parentId,
        luau_ast_1.default.number(index + 1),
        luau_ast_1.default.unary("#", parentId),
        luau_ast_1.default.number(1),
        luau_ast_1.default.array(),
    ]);
}
//# sourceMappingURL=spreadDestructureArray.js.map