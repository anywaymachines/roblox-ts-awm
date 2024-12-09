"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacroManager = exports.NOMINAL_LUA_TUPLE_NAME = exports.SYMBOL_NAMES = void 0;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
const path_1 = __importDefault(require("path"));
const ProjectError_1 = require("../../Shared/errors/ProjectError");
const assert_1 = require("../../Shared/util/assert");
const callMacros_1 = require("../macros/callMacros");
const constructorMacros_1 = require("../macros/constructorMacros");
const identifierMacros_1 = require("../macros/identifierMacros");
const propertyCallMacros_1 = require("../macros/propertyCallMacros");
const traversal_1 = require("../util/traversal");
const typescript_1 = __importDefault(require("typescript"));
function getType(typeChecker, node) {
    return typeChecker.getTypeAtLocation((0, traversal_1.skipUpwards)(node));
}
const TYPES_NOTICE = "\nYou may need to update your @rbxts/compiler-types!";
exports.SYMBOL_NAMES = {
    globalThis: "globalThis",
    ArrayConstructor: "ArrayConstructor",
    SetConstructor: "SetConstructor",
    MapConstructor: "MapConstructor",
    WeakSetConstructor: "WeakSetConstructor",
    WeakMapConstructor: "WeakMapConstructor",
    ReadonlyMapConstructor: "ReadonlyMapConstructor",
    ReadonlySetConstructor: "ReadonlySetConstructor",
    Array: "Array",
    Generator: "Generator",
    IterableFunction: "IterableFunction",
    LuaTuple: "LuaTuple",
    Map: "Map",
    Object: "Object",
    ReadonlyArray: "ReadonlyArray",
    ReadonlyMap: "ReadonlyMap",
    ReadonlySet: "ReadonlySet",
    ReadVoxelsArray: "ReadVoxelsArray",
    Set: "Set",
    String: "String",
    TemplateStringsArray: "TemplateStringsArray",
    WeakMap: "WeakMap",
    WeakSet: "WeakSet",
    Iterable: "Iterable",
    $range: "$range",
    $tuple: "$tuple",
};
exports.NOMINAL_LUA_TUPLE_NAME = "_nominal_LuaTuple";
const MACRO_ONLY_CLASSES = new Set([
    exports.SYMBOL_NAMES.ReadonlyArray,
    exports.SYMBOL_NAMES.Array,
    exports.SYMBOL_NAMES.ReadonlyMap,
    exports.SYMBOL_NAMES.WeakMap,
    exports.SYMBOL_NAMES.Map,
    exports.SYMBOL_NAMES.ReadonlySet,
    exports.SYMBOL_NAMES.WeakSet,
    exports.SYMBOL_NAMES.Set,
    exports.SYMBOL_NAMES.String,
]);
function getFirstDeclarationOrThrow(symbol, check) {
    var _a;
    for (const declaration of (_a = symbol.declarations) !== null && _a !== void 0 ? _a : []) {
        if (check(declaration)) {
            return declaration;
        }
    }
    throw new ProjectError_1.ProjectError("");
}
function getGlobalSymbolByNameOrThrow(typeChecker, name, meaning, location) {
    const symbol = typeChecker.resolveName(name, location, meaning, false);
    if (symbol) {
        return symbol;
    }
    throw new ProjectError_1.ProjectError(`MacroManager could not find symbol for ${name}` + TYPES_NOTICE);
}
function getConstructorSymbol(node) {
    for (const member of node.members) {
        if (typescript_1.default.isConstructSignatureDeclaration(member)) {
            (0, assert_1.assert)(member.symbol);
            return member.symbol;
        }
    }
    throw new ProjectError_1.ProjectError(`MacroManager could not find constructor for ${node.name.text}` + TYPES_NOTICE);
}
class MacroManager {
    constructor(typeChecker) {
        var _a, _b, _c;
        this.typeChecker = typeChecker;
        this.symbols = new Map();
        this.identifierMacros = new Map();
        this.callMacros = new Map();
        this.customCallMacros = new Map();
        this.constructorMacros = new Map();
        this.propertyCallMacros = new Map();
        this.customPropertyCallMacros = new Map();
        this.methodMap = new Map();
        for (const [name, macro] of Object.entries(identifierMacros_1.IDENTIFIER_MACROS)) {
            const symbol = getGlobalSymbolByNameOrThrow(typeChecker, name, typescript_1.default.SymbolFlags.Variable);
            this.identifierMacros.set(symbol, macro);
        }
        for (const [name, macro] of Object.entries(callMacros_1.CALL_MACROS)) {
            const symbol = getGlobalSymbolByNameOrThrow(typeChecker, name, typescript_1.default.SymbolFlags.Function);
            this.callMacros.set(symbol, macro);
        }
        for (const [className, macro] of Object.entries(constructorMacros_1.CONSTRUCTOR_MACROS)) {
            const symbol = getGlobalSymbolByNameOrThrow(typeChecker, className, typescript_1.default.SymbolFlags.Interface);
            const interfaceDec = getFirstDeclarationOrThrow(symbol, typescript_1.default.isInterfaceDeclaration);
            const constructSymbol = getConstructorSymbol(interfaceDec);
            this.constructorMacros.set(constructSymbol, macro);
        }
        for (const [className, methods] of Object.entries(propertyCallMacros_1.PROPERTY_CALL_MACROS)) {
            const symbol = getGlobalSymbolByNameOrThrow(typeChecker, className, typescript_1.default.SymbolFlags.Interface);
            const methodMap = new Map();
            for (const declaration of (_a = symbol.declarations) !== null && _a !== void 0 ? _a : []) {
                if (typescript_1.default.isInterfaceDeclaration(declaration)) {
                    for (const member of declaration.members) {
                        if (typescript_1.default.isMethodSignature(member) && typescript_1.default.isIdentifier(member.name)) {
                            const symbol = getType(typeChecker, member).symbol;
                            (0, assert_1.assert)(symbol);
                            methodMap.set(member.name.text, symbol);
                        }
                    }
                }
            }
            for (const [methodName, macro] of Object.entries(methods)) {
                const methodSymbol = methodMap.get(methodName);
                if (!methodSymbol) {
                    throw new ProjectError_1.ProjectError(`MacroManager could not find method for ${className}.${methodName}` + TYPES_NOTICE);
                }
                this.propertyCallMacros.set(methodSymbol, macro);
            }
            this.methodMap.set(symbol.name, methodMap);
        }
        for (const symbolName of Object.values(exports.SYMBOL_NAMES)) {
            const symbol = typeChecker.resolveName(symbolName, undefined, typescript_1.default.SymbolFlags.All, false);
            if (symbol) {
                this.symbols.set(symbolName, symbol);
            }
            else {
                throw new ProjectError_1.ProjectError(`MacroManager could not find symbol for ${symbolName}` + TYPES_NOTICE);
            }
        }
        const luaTupleTypeDec = (_c = (_b = this.symbols
            .get(exports.SYMBOL_NAMES.LuaTuple)) === null || _b === void 0 ? void 0 : _b.declarations) === null || _c === void 0 ? void 0 : _c.find(v => typescript_1.default.isTypeAliasDeclaration(v));
        if (luaTupleTypeDec) {
            const nominalLuaTupleSymbol = typeChecker
                .getTypeAtLocation(luaTupleTypeDec)
                .getProperty(exports.NOMINAL_LUA_TUPLE_NAME);
            if (nominalLuaTupleSymbol) {
                this.symbols.set(exports.NOMINAL_LUA_TUPLE_NAME, nominalLuaTupleSymbol);
            }
        }
    }
    getSymbolOrThrow(name) {
        const symbol = this.symbols.get(name);
        (0, assert_1.assert)(symbol);
        return symbol;
    }
    isMacroOnlyClass(symbol) {
        return this.symbols.get(symbol.name) === symbol && MACRO_ONLY_CLASSES.has(symbol.name);
    }
    getIdentifierMacro(symbol) {
        return this.identifierMacros.get(symbol);
    }
    getCallMacro(symbol) {
        var _a;
        return (_a = this.callMacros.get(symbol)) !== null && _a !== void 0 ? _a : this.customCallMacros.get(symbol);
    }
    getConstructorMacro(symbol) {
        return this.constructorMacros.get(symbol);
    }
    getPropertyCallMacro(symbol) {
        var _a;
        const macro = (_a = this.propertyCallMacros.get(symbol)) !== null && _a !== void 0 ? _a : this.customPropertyCallMacros.get(symbol);
        if (!macro &&
            symbol.parent &&
            this.symbols.get(symbol.parent.name) === symbol.parent &&
            this.isMacroOnlyClass(symbol.parent)) {
            (0, assert_1.assert)(false, `Macro ${symbol.parent.name}.${symbol.name}() is not implemented!`);
        }
        return macro;
    }
    addCallMacrosFromFiles(files) {
        const addMacro = (name, file) => {
            const smb = getGlobalSymbolByNameOrThrow(this.typeChecker, name.text, typescript_1.default.SymbolFlags.Function);
            const pth = path_1.default.relative("src", file.path);
            const macro = (state, node, expression, args) => {
                const identifier = state.customLib(node, pth, name.text, file);
                return luau_ast_1.default.call(identifier, args);
            };
            this.customCallMacros.set(smb, macro);
        };
        const isExported = (node) => { var _a; return ((_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.find(typescript_1.default.isExportModifier)) !== undefined; };
        for (const file of files) {
            if (!file.path.includes(".callmacro."))
                continue;
            for (const statement of file.statements) {
                if (typescript_1.default.isFunctionDeclaration(statement)) {
                    if (!isExported(statement))
                        continue;
                    if (!statement.name)
                        continue;
                    const name = statement.name;
                    addMacro(name, file);
                }
            }
        }
    }
    addPropertyMacrosFromFiles(files) {
        var _a, _b;
        const addInterfaceMethods = (declaration, methodMap) => {
            for (const member of declaration.members) {
                if (typescript_1.default.isMethodSignature(member) && typescript_1.default.isIdentifier(member.name)) {
                    const symbol = getType(this.typeChecker, member).symbol;
                    (0, assert_1.assert)(symbol);
                    methodMap.set(member.name.text, symbol);
                }
            }
        };
        const addMacro = (declarationName, propertyName, type, file) => {
            var _a;
            const smb = (_a = this.methodMap.get(type.text)) === null || _a === void 0 ? void 0 : _a.get(propertyName.text);
            if (!smb) {
                throw new ProjectError_1.ProjectError(`MacroManager could not find symbol for ${type}.${propertyName.text}` + TYPES_NOTICE);
            }
            const pth = path_1.default.relative("src", file.path);
            const macro = (state, node, expression, args) => {
                const identifier = state.sourceFile.fileName === file.fileName
                    ? luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Identifier, { name: declarationName.text })
                    : state.customLib(node, pth, declarationName.text, file);
                const expr = state.pushToVar(expression);
                args = args.map(arg => state.pushToVarIfComplex(arg));
                return luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.IfExpression, {
                    condition: luau_ast_1.default.binary(luau_ast_1.default.binary(luau_ast_1.default.call(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Identifier, { name: "type" }), [expr]), "==", luau_ast_1.default.string("table")), "and", luau_ast_1.default.binary(luau_ast_1.default.property(expr, propertyName.text), "~=", luau_ast_1.default.nil())),
                    expression: luau_ast_1.default.call(luau_ast_1.default.property(expr, propertyName.text), [expr, ...args]),
                    alternative: luau_ast_1.default.call(luau_ast_1.default.property(identifier, propertyName.text), [expr, ...args]),
                });
            };
            this.customPropertyCallMacros.set(smb, macro);
        };
        const isExported = (node) => { var _a; return ((_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.find(typescript_1.default.isExportModifier)) !== undefined; };
        for (const file of files) {
            if (!file.path.includes(".propmacro."))
                continue;
            for (const statement of file.statements) {
                if (typescript_1.default.isModuleDeclaration(statement)) {
                    if (((_a = statement.modifiers) === null || _a === void 0 ? void 0 : _a[0].kind) !== typescript_1.default.SyntaxKind.DeclareKeyword)
                        continue;
                    if (!statement.body || !typescript_1.default.isModuleBlock(statement.body))
                        continue;
                    for (const declaration of statement.body.statements) {
                        if (!typescript_1.default.isInterfaceDeclaration(declaration))
                            continue;
                        const methodMap = (_b = this.methodMap.get(declaration.name.text)) !== null && _b !== void 0 ? _b : new Map();
                        addInterfaceMethods(declaration, methodMap);
                        this.methodMap.set(declaration.name.text, methodMap);
                    }
                }
                else if (typescript_1.default.isVariableStatement(statement)) {
                    if (!isExported(statement))
                        continue;
                    for (const declaration of statement.declarationList.declarations) {
                        if (!typescript_1.default.isIdentifier(declaration.name))
                            continue;
                        if (!declaration.type || !typescript_1.default.isTypeReferenceNode(declaration.type))
                            continue;
                        if (!typescript_1.default.isIdentifier(declaration.type.typeName))
                            continue;
                        if (declaration.type.typeName.text !== "PropertyMacros")
                            continue;
                        if (!declaration.type.typeArguments)
                            continue;
                        if (declaration.type.typeArguments.length !== 1)
                            continue;
                        if (!declaration.initializer || !typescript_1.default.isObjectLiteralExpression(declaration.initializer)) {
                            continue;
                        }
                        const type = declaration.type.typeArguments[0];
                        if (!typescript_1.default.isTypeReferenceNode(type))
                            continue;
                        if (!typescript_1.default.isIdentifier(type.typeName))
                            continue;
                        const declarationName = declaration.name;
                        for (const prop of declaration.initializer.properties) {
                            if (!typescript_1.default.isPropertyAssignment(prop))
                                continue;
                            if (!prop.name || !typescript_1.default.isIdentifier(prop.name))
                                continue;
                            if (!typescript_1.default.isArrowFunction(prop.initializer))
                                continue;
                            addMacro(declarationName, prop.name, type.typeName, file);
                        }
                    }
                }
            }
        }
    }
}
exports.MacroManager = MacroManager;
//# sourceMappingURL=MacroManager.js.map