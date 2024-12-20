"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSourceFile = transformSourceFile;
const luau_ast_1 = __importDefault(require("@roblox-ts/luau-ast"));
const rojo_resolver_1 = require("@roblox-ts/rojo-resolver");
const constants_1 = require("../../Shared/constants");
const assert_1 = require("../../Shared/util/assert");
const transformIdentifier_1 = require("./expressions/transformIdentifier");
const transformStatementList_1 = require("./transformStatementList");
const createImportExpression_1 = require("../util/createImportExpression");
const getOriginalSymbolOfNode_1 = require("../util/getOriginalSymbolOfNode");
const isSymbolMutable_1 = require("../util/isSymbolMutable");
const isSymbolOfValue_1 = require("../util/isSymbolOfValue");
const traversal_1 = require("../util/traversal");
const typescript_1 = __importDefault(require("typescript"));
function getExportPair(state, exportSymbol) {
    var _a, _b;
    const declaration = (_a = exportSymbol.getDeclarations()) === null || _a === void 0 ? void 0 : _a[0];
    if (declaration && typescript_1.default.isExportSpecifier(declaration)) {
        return [declaration.name.text, (0, transformIdentifier_1.transformIdentifierDefined)(state, (_b = declaration.propertyName) !== null && _b !== void 0 ? _b : declaration.name)];
    }
    else {
        let name = exportSymbol.name;
        if (exportSymbol.name === "default" &&
            declaration &&
            (typescript_1.default.isFunctionDeclaration(declaration) || typescript_1.default.isClassDeclaration(declaration)) &&
            declaration.name) {
            name = declaration.name.text;
        }
        return [exportSymbol.name, luau_ast_1.default.id(name)];
    }
}
function isExportSymbolFromExportFrom(exportSymbol) {
    if (exportSymbol.declarations) {
        for (const exportSpecifier of exportSymbol.declarations) {
            if (typescript_1.default.isExportSpecifier(exportSpecifier)) {
                const exportDec = exportSpecifier.parent.parent;
                if (typescript_1.default.isExportDeclaration(exportDec) && exportDec.moduleSpecifier) {
                    return true;
                }
            }
        }
    }
    return false;
}
function getIgnoredExportSymbols(state, sourceFile) {
    const ignoredSymbols = new Set();
    for (const statement of sourceFile.statements) {
        if (typescript_1.default.isExportDeclaration(statement) && statement.moduleSpecifier) {
            if (!statement.exportClause) {
                const moduleSymbol = (0, getOriginalSymbolOfNode_1.getOriginalSymbolOfNode)(state.typeChecker, statement.moduleSpecifier);
                if (moduleSymbol) {
                    state.getModuleExports(moduleSymbol).forEach(v => ignoredSymbols.add(v));
                }
            }
            else if (typescript_1.default.isNamespaceExport(statement.exportClause)) {
                const idSymbol = state.typeChecker.getSymbolAtLocation(statement.exportClause.name);
                if (idSymbol) {
                    ignoredSymbols.add(idSymbol);
                }
            }
        }
    }
    return ignoredSymbols;
}
function isExportSymbolOnlyFromDeclare(exportSymbol) {
    var _a, _b;
    return ((_b = (_a = exportSymbol.declarations) === null || _a === void 0 ? void 0 : _a.every(declaration => {
        const statement = (0, traversal_1.getAncestor)(declaration, typescript_1.default.isStatement);
        const modifiers = statement && typescript_1.default.canHaveModifiers(statement) ? typescript_1.default.getModifiers(statement) : undefined;
        return modifiers === null || modifiers === void 0 ? void 0 : modifiers.some(v => v.kind === typescript_1.default.SyntaxKind.DeclareKeyword);
    })) !== null && _b !== void 0 ? _b : false);
}
function handleExports(state, sourceFile, symbol, statements) {
    const ignoredExportSymbols = getIgnoredExportSymbols(state, sourceFile);
    let mustPushExports = state.hasExportFrom;
    const exportPairs = new Array();
    if (!state.hasExportEquals) {
        for (const exportSymbol of state.getModuleExports(symbol)) {
            if (ignoredExportSymbols.has(exportSymbol))
                continue;
            if (!!(exportSymbol.flags & typescript_1.default.SymbolFlags.Prototype))
                continue;
            if (isExportSymbolFromExportFrom(exportSymbol))
                continue;
            const originalSymbol = typescript_1.default.skipAlias(exportSymbol, state.typeChecker);
            if (!(0, isSymbolOfValue_1.isSymbolOfValue)(originalSymbol))
                continue;
            if ((0, isSymbolMutable_1.isSymbolMutable)(state, originalSymbol)) {
                mustPushExports = true;
                continue;
            }
            if (isExportSymbolOnlyFromDeclare(exportSymbol))
                continue;
            exportPairs.push(getExportPair(state, exportSymbol));
        }
    }
    if (state.hasExportEquals) {
        const finalStatement = sourceFile.statements[sourceFile.statements.length - 1];
        if (!(typescript_1.default.isExportAssignment(finalStatement) && finalStatement.isExportEquals)) {
            luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ReturnStatement, {
                expression: luau_ast_1.default.globals.exports,
            }));
        }
    }
    else if (mustPushExports) {
        luau_ast_1.default.list.unshift(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
            left: luau_ast_1.default.globals.exports,
            right: luau_ast_1.default.map(),
        }));
        for (const [exportKey, exportId] of exportPairs) {
            luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Assignment, {
                left: luau_ast_1.default.property(luau_ast_1.default.globals.exports, exportKey),
                operator: "=",
                right: exportId,
            }));
        }
        luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ReturnStatement, {
            expression: luau_ast_1.default.globals.exports,
        }));
    }
    else if (exportPairs.length > 0) {
        const fields = luau_ast_1.default.list.make();
        for (const [exportKey, exportId] of exportPairs) {
            luau_ast_1.default.list.push(fields, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MapField, {
                index: luau_ast_1.default.string(exportKey),
                value: exportId,
            }));
        }
        luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ReturnStatement, {
            expression: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Map, {
                fields,
            }),
        }));
    }
}
function getLastNonCommentStatement(listNode) {
    while (listNode && luau_ast_1.default.isComment(listNode.value)) {
        listNode = listNode.prev;
    }
    return listNode;
}
function transformSourceFile(state, node) {
    const symbol = state.typeChecker.getSymbolAtLocation(node);
    (0, assert_1.assert)(symbol);
    state.setModuleIdBySymbol(symbol, luau_ast_1.default.globals.exports);
    const statements = (0, transformStatementList_1.transformStatementList)(state, node, node.statements, undefined);
    handleExports(state, node, symbol, statements);
    const lastStatement = getLastNonCommentStatement(statements.tail);
    if (!lastStatement || !luau_ast_1.default.isReturnStatement(lastStatement.value)) {
        const outputPath = state.pathTranslator.getOutputPath(node.fileName);
        if (state.rojoResolver.getRbxTypeFromFilePath(outputPath) === rojo_resolver_1.RbxType.ModuleScript) {
            luau_ast_1.default.list.push(statements, luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ReturnStatement, { expression: luau_ast_1.default.nil() }));
        }
    }
    const headerStatements = luau_ast_1.default.list.make();
    luau_ast_1.default.list.push(headerStatements, luau_ast_1.default.comment(` Compiled with roblox-ts v${constants_1.COMPILER_VERSION}`));
    if (state.usesRuntimeLib || state.customLibs.size > 0) {
        luau_ast_1.default.list.push(headerStatements, state.createRuntimeLibImport(node));
    }
    for (const [path, { set: names, file }] of state.customLibs) {
        const specifier = typescript_1.default.factory.createStringLiteral(path);
        specifier.parent = node.getSourceFile();
        for (const name of names) {
            const ex = luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                left: luau_ast_1.default.list.make(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Identifier, { name })),
                right: luau_ast_1.default.property(luau_ast_1.default.call(state.TS(state.sourceFile, "import"), [
                    luau_ast_1.default.globals.script,
                    ...(0, createImportExpression_1.getImportParts)(state, node.getSourceFile(), specifier, file),
                ]), name),
            });
            luau_ast_1.default.list.push(headerStatements, ex);
        }
    }
    const directiveComments = luau_ast_1.default.list.make();
    while (statements.head && luau_ast_1.default.isComment(statements.head.value) && statements.head.value.text.startsWith("!")) {
        luau_ast_1.default.list.push(directiveComments, luau_ast_1.default.list.shift(statements));
    }
    luau_ast_1.default.list.unshiftList(statements, headerStatements);
    luau_ast_1.default.list.unshiftList(statements, directiveComments);
    return statements;
}
//# sourceMappingURL=transformSourceFile.js.map