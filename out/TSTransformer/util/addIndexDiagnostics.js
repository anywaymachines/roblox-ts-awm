"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addIndexDiagnostics = addIndexDiagnostics;
const diagnostics_1 = require("../../Shared/diagnostics");
const DiagnosticService_1 = require("../classes/DiagnosticService");
const isMethod_1 = require("./isMethod");
const isValidMethodIndexWithoutCall_1 = require("./isValidMethodIndexWithoutCall");
const traversal_1 = require("./traversal");
const types_1 = require("./types");
const typescript_1 = __importDefault(require("typescript"));
function addIndexDiagnostics(state, node, expType) {
    const symbol = (0, types_1.getFirstDefinedSymbol)(state, expType);
    const up = (0, traversal_1.skipUpwards)(node);
    if ((symbol && state.services.macroManager.getPropertyCallMacro(symbol)) ||
        (!(0, isValidMethodIndexWithoutCall_1.isValidMethodIndexWithoutCall)(state, up) && (0, isMethod_1.isMethod)(state, node))) {
        let parent = up;
        while (true) {
            if (!parent)
                break;
            if (!typescript_1.default.isExpression(parent))
                break;
            if (typescript_1.default.isCallExpression(parent) &&
                typescript_1.default.isPropertyAccessExpression(parent.expression) &&
                typescript_1.default.isIdentifier(parent.expression.name)) {
                return;
            }
            parent = parent.parent;
        }
        DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noIndexWithoutCall(node));
    }
    if (typescript_1.default.isPrototypeAccess(node)) {
        DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noPrototype(node));
    }
}
//# sourceMappingURL=addIndexDiagnostics.js.map