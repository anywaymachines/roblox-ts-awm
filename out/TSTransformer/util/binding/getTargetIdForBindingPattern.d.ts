import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../../classes/TransformState";
import ts from "typescript";
export declare function getTargetIdForBindingPattern(state: TransformState, name: ts.BindingPattern, value: luau.Expression): luau.TemporaryIdentifier | luau.Identifier;
