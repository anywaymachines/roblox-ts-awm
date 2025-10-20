import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../..";
import ts from "typescript";
export declare function transformBinaryExpression(state: TransformState, node: ts.BinaryExpression): luau.TemporaryIdentifier | luau.Identifier | luau.PropertyAccessExpression | luau.ComputedIndexExpression | luau.CallExpression | luau.MethodCallExpression | luau.ParenthesizedExpression | luau.None | luau.NilLiteral | luau.FalseLiteral | luau.TrueLiteral | luau.NumberLiteral | luau.StringLiteral | luau.VarArgsLiteral | luau.FunctionExpression | luau.BinaryExpression | luau.UnaryExpression | luau.IfExpression | luau.InterpolatedString | luau.Array | luau.Map | luau.Set | luau.MixedTable;
