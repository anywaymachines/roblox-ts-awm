"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArrayBindingPattern = transformArrayBindingPattern;
const transformObjectBindingPattern_1 = require("./transformObjectBindingPattern");
const transformVariableStatement_1 = require("../statements/transformVariableStatement");
const transformInitializer_1 = require("../transformInitializer");
const getAccessorForBindingType_1 = require("../../util/binding/getAccessorForBindingType");
const spreadDestructuring_1 = require("../../util/spreadDestructuring");
const validateNotAny_1 = require("../../util/validateNotAny");
const typescript_1 = __importDefault(require("typescript"));
function transformArrayBindingPattern(state, bindingPattern, parentId) {
    (0, validateNotAny_1.validateNotAnyType)(state, bindingPattern);
    let index = 0;
    const idStack = new Array();
    const accessor = (0, getAccessorForBindingType_1.getAccessorForBindingType)(state, bindingPattern, state.getType(bindingPattern));
    const destructor = (0, spreadDestructuring_1.getSpreadDestructorForType)(state, bindingPattern, state.getType(bindingPattern));
    for (const element of bindingPattern.elements) {
        if (typescript_1.default.isOmittedExpression(element)) {
            accessor(state, parentId, index, idStack, true);
        }
        else {
            const name = element.name;
            const isSpreadElement = element.dotDotDotToken !== undefined;
            const value = isSpreadElement
                ? destructor(state, parentId, index, idStack)
                : accessor(state, parentId, index, idStack, false);
            if (typescript_1.default.isIdentifier(name)) {
                const id = (0, transformVariableStatement_1.transformVariable)(state, name, value);
                if (element.initializer) {
                    state.prereq((0, transformInitializer_1.transformInitializer)(state, id, element.initializer));
                }
            }
            else {
                const id = state.pushToVar(value, "binding");
                if (element.initializer) {
                    state.prereq((0, transformInitializer_1.transformInitializer)(state, id, element.initializer));
                }
                if (typescript_1.default.isArrayBindingPattern(name)) {
                    transformArrayBindingPattern(state, name, id);
                }
                else {
                    (0, transformObjectBindingPattern_1.transformObjectBindingPattern)(state, name, id);
                }
            }
        }
        index++;
    }
}
//# sourceMappingURL=transformArrayBindingPattern.js.map