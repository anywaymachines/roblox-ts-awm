import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../classes/TransformState";
import ts from "typescript";
export declare function isBitwiseOperator(operatorKind: ts.BinaryOperator): boolean;
export declare function createBitwiseCall(operatorKind: ts.BinaryOperator, expressions: Array<luau.Expression>): luau.Expression;
export declare function createBitwiseFromOperator(state: TransformState, operatorKind: ts.BinaryOperator, node: ts.BinaryExpression): luau.Expression;
