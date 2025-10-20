"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBitwiseOperator = isBitwiseOperator;
exports.createBitwiseCall = createBitwiseCall;
exports.createBitwiseFromOperator = createBitwiseFromOperator;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
const assert_1 = require("../../Shared/util/assert");
const ensureTransformOrder_1 = require("./ensureTransformOrder");
const getKindName_1 = require("./getKindName");
const traversal_1 = require("./traversal");
const typescript_1 = __importDefault(require("typescript"));
const OPERATOR_MAP = new Map([
    [typescript_1.default.SyntaxKind.LessThanLessThanToken, "lshift"],
    [typescript_1.default.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, "rshift"],
    [typescript_1.default.SyntaxKind.GreaterThanGreaterThanToken, "arshift"],
    [typescript_1.default.SyntaxKind.AmpersandEqualsToken, "band"],
    [typescript_1.default.SyntaxKind.BarEqualsToken, "bor"],
    [typescript_1.default.SyntaxKind.CaretEqualsToken, "bxor"],
    [typescript_1.default.SyntaxKind.LessThanLessThanEqualsToken, "lshift"],
    [typescript_1.default.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, "rshift"],
    [typescript_1.default.SyntaxKind.GreaterThanGreaterThanEqualsToken, "arshift"],
]);
const LOGICAL_OPERATOR_MAP = new Map([
    [typescript_1.default.SyntaxKind.AmpersandToken, "band"],
    [typescript_1.default.SyntaxKind.BarToken, "bor"],
    [typescript_1.default.SyntaxKind.CaretToken, "bxor"],
]);
function flattenBitwiseSegmentInto(expressionList, operatorKind, node) {
    if (typescript_1.default.isBinaryExpression(node)) {
        if (operatorKind === node.operatorToken.kind) {
            flattenBitwiseSegmentInto(expressionList, operatorKind, node.left);
            expressionList.push((0, traversal_1.skipDownwards)(node.right));
        }
        else {
            expressionList.push(node);
        }
        return;
    }
    expressionList.push((0, traversal_1.skipDownwards)(node));
}
function isBitwiseLogicalOperator(operatorKind) {
    return LOGICAL_OPERATOR_MAP.has(operatorKind);
}
function isBitwiseOperator(operatorKind) {
    return OPERATOR_MAP.has(operatorKind) || isBitwiseLogicalOperator(operatorKind);
}
function createBitwiseCall(operatorKind, expressions) {
    var _a;
    const name = (_a = OPERATOR_MAP.get(operatorKind)) !== null && _a !== void 0 ? _a : LOGICAL_OPERATOR_MAP.get(operatorKind);
    (0, assert_1.assert)(name !== undefined, `createBitwiseFromOperator unknown operator: ${(0, getKindName_1.getKindName)(operatorKind)}`);
    return luau_ast_1.default.call(luau_ast_1.default.property(luau_ast_1.default.globals.bit32, name), expressions);
}
function createBitwiseFromOperator(state, operatorKind, node) {
    const flattenedExpressions = new Array();
    if (isBitwiseLogicalOperator(operatorKind)) {
        flattenBitwiseSegmentInto(flattenedExpressions, operatorKind, node.left);
        flattenedExpressions.push(node.right);
    }
    else {
        flattenedExpressions.push(node.left, node.right);
    }
    return createBitwiseCall(operatorKind, (0, ensureTransformOrder_1.ensureTransformOrder)(state, flattenedExpressions));
}
//# sourceMappingURL=bitwise.js.map