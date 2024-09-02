import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../..";
import ts from "typescript";
export declare function transformPostfixUnaryExpression(state: TransformState, node: ts.PostfixUnaryExpression): luau.TemporaryIdentifier;
export declare function transformPrefixUnaryExpression(state: TransformState, node: ts.PrefixUnaryExpression): luau.Identifier | luau.TemporaryIdentifier | luau.ComputedIndexExpression | luau.PropertyAccessExpression | luau.CallExpression | luau.MethodCallExpression | luau.ParenthesizedExpression | luau.None | luau.NilLiteral | luau.FalseLiteral | luau.TrueLiteral | luau.NumberLiteral | luau.StringLiteral | luau.VarArgsLiteral | luau.FunctionExpression | luau.BinaryExpression | luau.UnaryExpression | luau.IfExpression | luau.InterpolatedString | luau.Array | luau.Map | luau.Set | luau.MixedTable;
