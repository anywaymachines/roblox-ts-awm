import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../../classes/TransformState";
export declare function spreadDestructureSet(state: TransformState, parentId: luau.AnyIdentifier, index: number, idStack: Array<luau.AnyIdentifier>): luau.TemporaryIdentifier;
