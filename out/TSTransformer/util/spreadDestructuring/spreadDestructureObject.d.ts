import luau from "@roblox-ts/luau-ast";
import { TransformState } from "../../classes/TransformState";
export declare function spreadDestructureObject(state: TransformState, parentId: luau.AnyIdentifier, preSpreadNames: Array<luau.Expression>): luau.TemporaryIdentifier;
