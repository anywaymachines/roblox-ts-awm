"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadDestructureGenerator = spreadDestructureGenerator;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
function spreadDestructureGenerator(state, parentId) {
    const restId = state.pushToVar(luau_ast_1.default.array(), "rest");
    const valueId = luau_ast_1.default.tempId("v");
    const variable = luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
        left: valueId,
        right: luau_ast_1.default.call(luau_ast_1.default.property(parentId, "next")),
    });
    const doneCheck = luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfStatement, {
        condition: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BinaryExpression, {
            left: luau_ast_1.default.property(valueId, "done"),
            operator: "==",
            right: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.TrueLiteral, {}),
        }),
        elseBody: luau_ast_1.default.list.make(),
        statements: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.BreakStatement, {})),
    });
    const pushToRest = luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.CallStatement, {
        expression: luau_ast_1.default.call(luau_ast_1.default.globals.table.insert, [restId, luau_ast_1.default.property(valueId, "value")]),
    });
    state.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.WhileStatement, {
        condition: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.TrueLiteral, {}),
        statements: luau_ast_1.default.list.make(variable, doneCheck, pushToRest),
    }));
    return restId;
}
//# sourceMappingURL=spreadDestructureGenerator.js.map