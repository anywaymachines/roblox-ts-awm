"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformObjectBindingPattern = transformObjectBindingPattern;
const diagnostics_1 = require("../../../Shared/diagnostics");
const assert_1 = require("../../../Shared/util/assert");
const DiagnosticService_1 = require("../../classes/DiagnosticService");
const transformArrayBindingPattern_1 = require("./transformArrayBindingPattern");
const transformVariableStatement_1 = require("../statements/transformVariableStatement");
const transformInitializer_1 = require("../transformInitializer");
const objectAccessor_1 = require("../../util/binding/objectAccessor");
const spreadDestructuring_1 = require("../../util/spreadDestructuring");
const types_1 = require("../../util/types");
const validateNotAny_1 = require("../../util/validateNotAny");
const typescript_1 = __importDefault(require("typescript"));
function transformObjectBindingPattern(state, bindingPattern, parentId) {
    (0, validateNotAny_1.validateNotAnyType)(state, bindingPattern);
    const preSpreadNames = new Array();
    for (const element of bindingPattern.elements) {
        const name = element.name;
        const prop = element.propertyName;
        const isSpread = element.dotDotDotToken !== undefined;
        if (typescript_1.default.isIdentifier(name)) {
            const value = isSpread
                ? (0, spreadDestructuring_1.spreadDestructureObject)(state, parentId, preSpreadNames)
                : (0, objectAccessor_1.objectAccessor)(state, parentId, state.getType(bindingPattern), prop !== null && prop !== void 0 ? prop : name);
            preSpreadNames.push(value);
            if (isSpread && (0, types_1.isPossiblyType)(state.getType(bindingPattern), (0, types_1.isRobloxType)(state))) {
                DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noRestSpreadingOfRobloxTypes(element));
                continue;
            }
            const id = (0, transformVariableStatement_1.transformVariable)(state, name, value);
            if (element.initializer) {
                state.prereq((0, transformInitializer_1.transformInitializer)(state, id, element.initializer));
            }
        }
        else {
            (0, assert_1.assert)(prop);
            (0, assert_1.assert)(!isSpread);
            const value = (0, objectAccessor_1.objectAccessor)(state, parentId, state.getType(bindingPattern), prop);
            preSpreadNames.push(value);
            const id = state.pushToVar(value, "binding");
            if (element.initializer) {
                state.prereq((0, transformInitializer_1.transformInitializer)(state, id, element.initializer));
            }
            if (typescript_1.default.isArrayBindingPattern(name)) {
                (0, transformArrayBindingPattern_1.transformArrayBindingPattern)(state, name, id);
            }
            else {
                transformObjectBindingPattern(state, name, id);
            }
        }
    }
}
//# sourceMappingURL=transformObjectBindingPattern.js.map