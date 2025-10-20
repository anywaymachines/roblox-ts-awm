"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadDestructureObject = spreadDestructureObject;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
const assert_1 = require("../../../Shared/util/assert");
function spreadDestructureObject(state, parentId, preSpreadNames) {
    const extracted = state.pushToVar(luau_ast_1.default.set(preSpreadNames.map(expression => {
        if (luau_ast_1.default.isPropertyAccessExpression(expression))
            return luau_ast_1.default.string(expression.name);
        if (luau_ast_1.default.isComputedIndexExpression(expression))
            return expression.index;
        (0, assert_1.assert)(false, "Unknown expression type");
    })), "extracted");
    const rest = state.pushToVar(luau_ast_1.default.map(), "rest");
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
            statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression: rest,
                    index: keyId,
                }),
                operator: "=",
                right: valueId,
            })),
        })),
    }));
    return rest;
}
//# sourceMappingURL=spreadDestructureObject.js.map