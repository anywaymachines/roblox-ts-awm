import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../../classes/TransformState";
import ts from "typescript";
export * from "./spreadDestructureArray";
export * from "./spreadDestructureMap";
export * from "./spreadDestructureObject";
export * from "./spreadDestructureSet";
type SpreadDestructor = (state: TransformState, parentId: luau.AnyIdentifier, index: number, idStack: Array<luau.AnyIdentifier>) => luau.Expression;
export declare function getSpreadDestructorForType(state: TransformState, node: ts.Node, type: ts.Type): SpreadDestructor;
