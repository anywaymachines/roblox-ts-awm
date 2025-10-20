"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadDestructureMap = spreadDestructureMap;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
function spreadDestructureMap(state, parentId, index, idStack) {
    const extracted = state.pushToVar(luau_ast_1.default.set(idStack), "extracted");
    const rest = state.pushToVar(luau_ast_1.default.array(), "rest");
    const keyId = luau_ast_1.default.tempId("k");
    const valueId = luau_ast_1.default.tempId("v");
    state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ForStatement, {
        ids: luau_ast_1.default.list.make(keyId, valueId),
        expression: parentId,
        statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
            condition: luau_ast_1.default.unary("not", luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                expression: extracted,
                index: keyId,
            })),
            elseBody: luau_ast_1.default.list.make(),
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
                expression: luau_ast_1.default.call(luau_ast_1.default.globals.table.insert, [
                    rest,
                    luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Array, {
                        members: luau_ast_1.default.list.make(keyId, valueId),
                    }),
                ]),
            })),
        })),
    }));
    return rest;
}
//# sourceMappingURL=spreadDestructureMap.js.map