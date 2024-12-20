"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformState = void 0;
const luau_ast_1 = __importStar(require("@roblox-ts/luau-ast"));
const rojo_resolver_1 = require("@roblox-ts/rojo-resolver");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../../Shared/constants");
const diagnostics_1 = require("../../Shared/diagnostics");
const assert_1 = require("../../Shared/util/assert");
const getCanonicalFileName_1 = require("../../Shared/util/getCanonicalFileName");
const getOrSetDefault_1 = require("../../Shared/util/getOrSetDefault");
const DiagnosticService_1 = require("./DiagnosticService");
const createGetService_1 = require("../util/createGetService");
const expressionChain_1 = require("../util/expressionChain");
const traversal_1 = require("../util/traversal");
const valueToIdStr_1 = require("../util/valueToIdStr");
const typescript_1 = __importDefault(require("typescript"));
class TransformState {
    debugRender(node) {
        const state = new luau_ast_1.RenderState();
        (0, luau_ast_1.solveTempIds)(state, node);
        return (0, luau_ast_1.render)(state, node);
    }
    debugRenderList(list) {
        const state = new luau_ast_1.RenderState();
        (0, luau_ast_1.solveTempIds)(state, list);
        return (0, luau_ast_1.renderStatements)(state, list);
    }
    constructor(program, data, services, pathTranslator, multiTransformState, compilerOptions, rojoResolver, pkgRojoResolvers, nodeModulesPathMapping, runtimeLibRbxPath, typeChecker, projectType, sourceFile) {
        this.program = program;
        this.data = data;
        this.services = services;
        this.pathTranslator = pathTranslator;
        this.multiTransformState = multiTransformState;
        this.compilerOptions = compilerOptions;
        this.rojoResolver = rojoResolver;
        this.pkgRojoResolvers = pkgRojoResolvers;
        this.nodeModulesPathMapping = nodeModulesPathMapping;
        this.runtimeLibRbxPath = runtimeLibRbxPath;
        this.typeChecker = typeChecker;
        this.projectType = projectType;
        this.sourceFile = sourceFile;
        this.hasExportEquals = false;
        this.hasExportFrom = false;
        this.classIdentifierMap = new Map();
        this.tryUsesStack = new Array();
        this.prereqStatementsStack = new Array();
        this.hoistsByStatement = new Map();
        this.isHoisted = new Map();
        this.getTypeCache = new Map();
        this.usesRuntimeLib = false;
        this.customLibs = new Map();
        this.moduleIdBySymbol = new Map();
        this.symbolToIdMap = new Map();
        this.classElementToObjectKeyMap = new Map();
        this.sourceFileText = sourceFile.getFullText();
        this.resolver = typeChecker.getEmitResolver(sourceFile);
        const sourceOutPath = this.pathTranslator.getOutputPath(sourceFile.fileName);
        const rbxPath = this.rojoResolver.getRbxPathFromFilePath(sourceOutPath);
        this.isInReplicatedFirst = rbxPath !== undefined && rbxPath[0] === "ReplicatedFirst";
    }
    pushTryUsesStack() {
        const tryUses = {
            usesReturn: false,
            usesBreak: false,
            usesContinue: false,
        };
        this.tryUsesStack.push(tryUses);
        return tryUses;
    }
    markTryUses(property) {
        if (this.tryUsesStack.length !== 0) {
            this.tryUsesStack[this.tryUsesStack.length - 1][property] = true;
        }
    }
    popTryUsesStack() {
        this.tryUsesStack.pop();
    }
    prereq(statement) {
        luau_ast_1.default.list.push(this.prereqStatementsStack[this.prereqStatementsStack.length - 1], statement);
    }
    prereqList(statements) {
        luau_ast_1.default.list.pushList(this.prereqStatementsStack[this.prereqStatementsStack.length - 1], statements);
    }
    pushPrereqStatementsStack() {
        const prereqStatements = luau_ast_1.default.list.make();
        this.prereqStatementsStack.push(prereqStatements);
        return prereqStatements;
    }
    popPrereqStatementsStack() {
        const poppedValue = this.prereqStatementsStack.pop();
        (0, assert_1.assert)(poppedValue);
        return poppedValue;
    }
    getLeadingComments(node) {
        var _a;
        const commentRanges = (_a = typescript_1.default.getLeadingCommentRanges(this.sourceFileText, node.pos)) !== null && _a !== void 0 ? _a : [];
        return luau_ast_1.default.list.make(...commentRanges.map(commentRange => luau_ast_1.default.comment(this.sourceFileText.substring(commentRange.pos + 2, commentRange.kind === typescript_1.default.SyntaxKind.SingleLineCommentTrivia
            ? commentRange.end
            : commentRange.end - 2))));
    }
    capturePrereqs(callback) {
        this.pushPrereqStatementsStack();
        callback();
        return this.popPrereqStatementsStack();
    }
    capture(callback) {
        let value;
        const prereqs = this.capturePrereqs(() => (value = callback()));
        return [value, prereqs];
    }
    noPrereqs(callback) {
        let expression;
        const statements = this.capturePrereqs(() => (expression = callback()));
        (0, assert_1.assert)(luau_ast_1.default.list.isEmpty(statements));
        return expression;
    }
    getType(node) {
        return (0, getOrSetDefault_1.getOrSetDefault)(this.getTypeCache, node, () => this.typeChecker.getTypeAtLocation((0, traversal_1.skipUpwards)(node)));
    }
    TS(node, name) {
        this.usesRuntimeLib = true;
        if (this.projectType === constants_1.ProjectType.Game && this.isInReplicatedFirst) {
            DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.warnings.runtimeLibUsedInReplicatedFirst(node));
        }
        return luau_ast_1.default.property(luau_ast_1.default.globals.TS, name);
    }
    customLib(node, libPath, importedProperty, file) {
        var _a, _b;
        const get = (name) => {
            return luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.Identifier, { name });
        };
        const spt = libPath.split("/");
        if ((_a = node.getSourceFile()) === null || _a === void 0 ? void 0 : _a.fileName.endsWith(spt[spt.length - 1] + ".ts")) {
            return get(importedProperty);
        }
        if (!this.customLibs.has(libPath)) {
            this.customLibs.set(libPath, { set: new Set(), file });
        }
        let size = 0;
        for (const [, lib] of this.customLibs) {
            size += lib.set.size;
        }
        const name = importedProperty;
        (_b = this.customLibs.get(libPath)) === null || _b === void 0 ? void 0 : _b.set.add(name);
        return get(name);
    }
    createRuntimeLibImport(sourceFile) {
        if (this.runtimeLibRbxPath) {
            if (this.projectType === constants_1.ProjectType.Game) {
                const serviceName = this.runtimeLibRbxPath[0];
                (0, assert_1.assert)(serviceName);
                let expression = (0, createGetService_1.createGetService)(serviceName);
                for (let i = 1; i < this.runtimeLibRbxPath.length; i++) {
                    expression = luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.MethodCallExpression, {
                        expression,
                        name: "WaitForChild",
                        args: luau_ast_1.default.list.make(luau_ast_1.default.string(this.runtimeLibRbxPath[i])),
                    });
                }
                expression = luau_ast_1.default.call(luau_ast_1.default.globals.require, [expression]);
                return luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                    left: luau_ast_1.default.globals.TS,
                    right: expression,
                });
            }
            else {
                const sourceOutPath = this.pathTranslator.getOutputPath(sourceFile.fileName);
                const rbxPath = this.rojoResolver.getRbxPathFromFilePath(sourceOutPath);
                if (!rbxPath) {
                    DiagnosticService_1.DiagnosticService.addDiagnostic(diagnostics_1.errors.noRojoData(sourceFile, path_1.default.relative(this.data.projectPath, sourceOutPath), false));
                    return luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                        left: luau_ast_1.default.globals.TS,
                        right: luau_ast_1.default.none(),
                    });
                }
                return luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                    left: luau_ast_1.default.globals.TS,
                    right: luau_ast_1.default.call(luau_ast_1.default.globals.require, [
                        (0, expressionChain_1.propertyAccessExpressionChain)(luau_ast_1.default.globals.script, rojo_resolver_1.RojoResolver.relative(rbxPath, this.runtimeLibRbxPath).map(v => v === rojo_resolver_1.RbxPathParent ? constants_1.PARENT_FIELD : v)),
                    ]),
                });
            }
        }
        else {
            return luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
                left: luau_ast_1.default.globals.TS,
                right: luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.ComputedIndexExpression, {
                    expression: luau_ast_1.default.globals._G,
                    index: luau_ast_1.default.globals.script,
                }),
            });
        }
    }
    pushToVar(expression, name) {
        const temp = luau_ast_1.default.tempId(name || (expression && (0, valueToIdStr_1.valueToIdStr)(expression)));
        this.prereq(luau_ast_1.default.create(luau_ast_1.default.SyntaxKind.VariableDeclaration, {
            left: temp,
            right: expression,
        }));
        return temp;
    }
    pushToVarIfComplex(expression, name) {
        if (luau_ast_1.default.isSimple(expression)) {
            return expression;
        }
        return this.pushToVar(expression, name);
    }
    pushToVarIfNonId(expression, name) {
        if (luau_ast_1.default.isAnyIdentifier(expression)) {
            return expression;
        }
        return this.pushToVar(expression, name);
    }
    getModuleExports(moduleSymbol) {
        return (0, getOrSetDefault_1.getOrSetDefault)(this.multiTransformState.getModuleExportsCache, moduleSymbol, () => this.typeChecker.getExportsOfModule(moduleSymbol));
    }
    getModuleExportsAliasMap(moduleSymbol) {
        return (0, getOrSetDefault_1.getOrSetDefault)(this.multiTransformState.getModuleExportsAliasMapCache, moduleSymbol, () => {
            var _a;
            const aliasMap = new Map();
            for (const exportSymbol of this.getModuleExports(moduleSymbol)) {
                const originalSymbol = typescript_1.default.skipAlias(exportSymbol, this.typeChecker);
                const declaration = (_a = exportSymbol.getDeclarations()) === null || _a === void 0 ? void 0 : _a[0];
                if (declaration && typescript_1.default.isExportSpecifier(declaration)) {
                    aliasMap.set(originalSymbol, declaration.name.text);
                }
                else {
                    aliasMap.set(originalSymbol, exportSymbol.name);
                }
            }
            return aliasMap;
        });
    }
    getModuleSymbolFromNode(node) {
        const moduleAncestor = (0, traversal_1.getModuleAncestor)(node);
        const exportSymbol = this.typeChecker.getSymbolAtLocation(typescript_1.default.isSourceFile(moduleAncestor) ? moduleAncestor : moduleAncestor.name);
        (0, assert_1.assert)(exportSymbol);
        return exportSymbol;
    }
    getModuleIdFromSymbol(moduleSymbol) {
        const moduleId = this.moduleIdBySymbol.get(moduleSymbol);
        (0, assert_1.assert)(moduleId);
        return moduleId;
    }
    setModuleIdBySymbol(moduleSymbol, moduleId) {
        this.moduleIdBySymbol.set(moduleSymbol, moduleId);
    }
    getModuleIdFromNode(node) {
        const moduleSymbol = this.getModuleSymbolFromNode(node);
        return this.getModuleIdFromSymbol(moduleSymbol);
    }
    getModuleIdPropertyAccess(idSymbol) {
        if (idSymbol.valueDeclaration) {
            const moduleSymbol = this.getModuleSymbolFromNode(idSymbol.valueDeclaration);
            const alias = this.getModuleExportsAliasMap(moduleSymbol).get(idSymbol);
            if (alias) {
                return luau_ast_1.default.property(this.getModuleIdFromSymbol(moduleSymbol), alias);
            }
        }
    }
    guessVirtualPath(fsPath) {
        var _a, _b, _c;
        const reverseSymlinkMap = (_b = (_a = this.program).getSymlinkCache) === null || _b === void 0 ? void 0 : _b.call(_a).getSymlinkedDirectoriesByRealpath();
        if (!reverseSymlinkMap)
            return;
        const original = fsPath;
        while (true) {
            const parent = typescript_1.default.ensureTrailingDirectorySeparator(path_1.default.dirname(fsPath));
            if (fsPath === parent)
                break;
            fsPath = parent;
            const symlink = (_c = reverseSymlinkMap.get(typescript_1.default.toPath(fsPath, this.program.getCurrentDirectory(), getCanonicalFileName_1.getCanonicalFileName))) === null || _c === void 0 ? void 0 : _c[0];
            if (symlink) {
                return path_1.default.join(symlink, path_1.default.relative(fsPath, original));
            }
        }
    }
    setClassElementObjectKey(classElement, identifier) {
        (0, assert_1.assert)(!this.classElementToObjectKeyMap.has(classElement));
        this.classElementToObjectKeyMap.set(classElement, identifier);
    }
    getClassElementObjectKey(classElement) {
        return this.classElementToObjectKeyMap.get(classElement);
    }
}
exports.TransformState = TransformState;
//# sourceMappingURL=TransformState.js.map