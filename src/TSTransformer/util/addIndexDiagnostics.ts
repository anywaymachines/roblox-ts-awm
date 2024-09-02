import { errors } from "Shared/diagnostics";
import { TransformState } from "TSTransformer";
import { DiagnosticService } from "TSTransformer/classes/DiagnosticService";
import { isMethod } from "TSTransformer/util/isMethod";
import { isValidMethodIndexWithoutCall } from "TSTransformer/util/isValidMethodIndexWithoutCall";
import { skipUpwards } from "TSTransformer/util/traversal";
import { getFirstDefinedSymbol } from "TSTransformer/util/types";
import ts from "typescript";

export function addIndexDiagnostics(
	state: TransformState,
	node: ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.SignatureDeclarationBase | ts.PropertyName,
	expType: ts.Type,
) {
	const symbol = getFirstDefinedSymbol(state, expType);

	const up = skipUpwards(node);

	if (
		(symbol && state.services.macroManager.getPropertyCallMacro(symbol)) ||
		(!isValidMethodIndexWithoutCall(state, up) && isMethod(state, node))
	) {
		let parent = up;
		while (true) {
			if (!parent) break;
			if (!ts.isExpression(parent)) break;

			if (
				ts.isCallExpression(parent) &&
				ts.isPropertyAccessExpression(parent.expression) &&
				ts.isIdentifier(parent.expression.name)
			) {
				return;
			}

			parent = parent.parent;
		}

		DiagnosticService.addDiagnostic(errors.noIndexWithoutCall(node));
	}

	if (ts.isPrototypeAccess(node)) {
		DiagnosticService.addDiagnostic(errors.noPrototype(node));
	}
}
