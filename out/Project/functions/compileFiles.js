"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileFiles = compileFiles;
const luau_ast_1 = require("@roblox-ts/luau-ast");
const rojo_resolver_1 = require("@roblox-ts/rojo-resolver");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const checkFileName_1 = require("./checkFileName");
const checkRojoConfig_1 = require("./checkRojoConfig");
const createNodeModulesPathMapping_1 = require("./createNodeModulesPathMapping");
const transformPaths_1 = __importDefault(require("../transformers/builtin/transformPaths"));
const transformTypeReferenceDirectives_1 = require("../transformers/builtin/transformTypeReferenceDirectives");
const createTransformerList_1 = require("../transformers/createTransformerList");
const createTransformerWatcher_1 = require("../transformers/createTransformerWatcher");
const getPluginConfigs_1 = require("../transformers/getPluginConfigs");
const getCustomPreEmitDiagnostics_1 = require("../util/getCustomPreEmitDiagnostics");
const LogService_1 = require("../../Shared/classes/LogService");
const constants_1 = require("../../Shared/constants");
const assert_1 = require("../../Shared/util/assert");
const benchmark_1 = require("../../Shared/util/benchmark");
const createTextDiagnostic_1 = require("../../Shared/util/createTextDiagnostic");
const getRootDirs_1 = require("../../Shared/util/getRootDirs");
const TSTransformer_1 = require("../../TSTransformer");
const DiagnosticService_1 = require("../../TSTransformer/classes/DiagnosticService");
const createTransformServices_1 = require("../../TSTransformer/util/createTransformServices");
const typescript_1 = __importDefault(require("typescript"));
function inferProjectType(data, rojoResolver) {
    if (data.isPackage) {
        return constants_1.ProjectType.Package;
    }
    else if (rojoResolver.isGame) {
        return constants_1.ProjectType.Game;
    }
    else {
        return constants_1.ProjectType.Model;
    }
}
function emitResultFailure(messageText) {
    return {
        emitSkipped: true,
        diagnostics: [(0, createTextDiagnostic_1.createTextDiagnostic)(messageText)],
    };
}
function compileFiles(program, data, pathTranslator, sourceFiles) {
    var _a;
    const compilerOptions = program.getCompilerOptions();
    const multiTransformState = new TSTransformer_1.MultiTransformState();
    const outDir = compilerOptions.outDir;
    const rojoResolver = data.rojoConfigPath
        ? rojo_resolver_1.RojoResolver.fromPath(data.rojoConfigPath)
        : rojo_resolver_1.RojoResolver.synthetic(outDir);
    for (const warning of rojoResolver.getWarnings()) {
        LogService_1.LogService.warn(warning);
    }
    (0, checkRojoConfig_1.checkRojoConfig)(data, rojoResolver, (0, getRootDirs_1.getRootDirs)(compilerOptions), pathTranslator);
    for (const sourceFile of program.getSourceFiles()) {
        if (!path_1.default.normalize(sourceFile.fileName).startsWith(data.nodeModulesPath)) {
            (0, checkFileName_1.checkFileName)(sourceFile.fileName);
        }
    }
    const pkgRojoResolvers = compilerOptions.typeRoots.map(rojo_resolver_1.RojoResolver.synthetic);
    const nodeModulesPathMapping = (0, createNodeModulesPathMapping_1.createNodeModulesPathMapping)(compilerOptions.typeRoots);
    const projectType = (_a = data.projectOptions.type) !== null && _a !== void 0 ? _a : inferProjectType(data, rojoResolver);
    if (projectType !== constants_1.ProjectType.Package && data.rojoConfigPath === undefined) {
        return emitResultFailure("Non-package projects must have a Rojo project file!");
    }
    let runtimeLibRbxPath;
    if (projectType !== constants_1.ProjectType.Package) {
        runtimeLibRbxPath = rojoResolver.getRbxPathFromFilePath(path_1.default.join(data.projectOptions.includePath, "RuntimeLib.lua"));
        if (!runtimeLibRbxPath) {
            return emitResultFailure("Rojo project contained no data for include folder!");
        }
        else if (rojoResolver.getNetworkType(runtimeLibRbxPath) !== rojo_resolver_1.NetworkType.Unknown) {
            return emitResultFailure("Runtime library cannot be in a server-only or client-only container!");
        }
        else if (rojoResolver.isIsolated(runtimeLibRbxPath)) {
            return emitResultFailure("Runtime library cannot be in an isolated container!");
        }
    }
    if (DiagnosticService_1.DiagnosticService.hasErrors())
        return { emitSkipped: true, diagnostics: DiagnosticService_1.DiagnosticService.flush() };
    LogService_1.LogService.writeLineIfVerbose(`compiling as ${projectType}..`);
    const fileWriteQueue = new Array();
    const progressMaxLength = `${sourceFiles.length}/${sourceFiles.length}`.length;
    let proxyProgram = program;
    if (compilerOptions.plugins && compilerOptions.plugins.length > 0) {
        (0, benchmark_1.benchmarkIfVerbose)(`running transformers..`, () => {
            var _a;
            const pluginConfigs = (0, getPluginConfigs_1.getPluginConfigs)(data.tsConfigPath);
            const transformerList = (0, createTransformerList_1.createTransformerList)(program, pluginConfigs, data.projectPath);
            const transformers = (0, createTransformerList_1.flattenIntoTransformers)(transformerList);
            if (transformers.length > 0) {
                const { service, updateFile } = ((_a = data.transformerWatcher) !== null && _a !== void 0 ? _a : (data.transformerWatcher = (0, createTransformerWatcher_1.createTransformerWatcher)(program)));
                const transformResult = typescript_1.default.transformNodes(undefined, undefined, typescript_1.default.factory, compilerOptions, sourceFiles, transformers, false);
                if (transformResult.diagnostics)
                    DiagnosticService_1.DiagnosticService.addDiagnostics(transformResult.diagnostics);
                for (const sourceFile of transformResult.transformed) {
                    if (typescript_1.default.isSourceFile(sourceFile)) {
                        const source = typescript_1.default.createPrinter().printFile(sourceFile);
                        updateFile(sourceFile.fileName, source);
                        if (data.projectOptions.writeTransformedFiles) {
                            const outPath = pathTranslator.getOutputTransformedPath(sourceFile.fileName);
                            fs_extra_1.default.outputFileSync(outPath, source);
                        }
                    }
                }
                proxyProgram = service.getProgram();
            }
        });
    }
    if (DiagnosticService_1.DiagnosticService.hasErrors())
        return { emitSkipped: true, diagnostics: DiagnosticService_1.DiagnosticService.flush() };
    const typeChecker = proxyProgram.getTypeChecker();
    const services = (0, createTransformServices_1.createTransformServices)(typeChecker);
    services.macroManager.addCallMacrosFromFiles(proxyProgram.getSourceFiles());
    services.macroManager.addPropertyMacrosFromFiles(proxyProgram.getSourceFiles());
    for (let i = 0; i < sourceFiles.length; i++) {
        const sourceFile = proxyProgram.getSourceFile(sourceFiles[i].fileName);
        (0, assert_1.assert)(sourceFile);
        const progress = `${i + 1}/${sourceFiles.length}`.padStart(progressMaxLength);
        (0, benchmark_1.benchmarkIfVerbose)(`${progress} compile ${path_1.default.relative(process.cwd(), sourceFile.fileName)}`, () => {
            DiagnosticService_1.DiagnosticService.addDiagnostics(typescript_1.default.getPreEmitDiagnostics(proxyProgram, sourceFile));
            DiagnosticService_1.DiagnosticService.addDiagnostics((0, getCustomPreEmitDiagnostics_1.getCustomPreEmitDiagnostics)(data, sourceFile));
            if (DiagnosticService_1.DiagnosticService.hasErrors())
                return;
            const transformState = new TSTransformer_1.TransformState(proxyProgram, data, services, pathTranslator, multiTransformState, compilerOptions, rojoResolver, pkgRojoResolvers, nodeModulesPathMapping, runtimeLibRbxPath, typeChecker, projectType, sourceFile);
            const luauAST = (0, TSTransformer_1.transformSourceFile)(transformState, sourceFile);
            if (DiagnosticService_1.DiagnosticService.hasErrors())
                return;
            const source = (0, luau_ast_1.renderAST)(luauAST);
            fileWriteQueue.push({ sourceFile, source });
        });
    }
    if (DiagnosticService_1.DiagnosticService.hasErrors())
        return { emitSkipped: true, diagnostics: DiagnosticService_1.DiagnosticService.flush() };
    const emittedFiles = new Array();
    if (fileWriteQueue.length > 0) {
        (0, benchmark_1.benchmarkIfVerbose)("writing compiled files", () => {
            const afterDeclarations = compilerOptions.declaration
                ? [transformTypeReferenceDirectives_1.transformTypeReferenceDirectives, (0, transformPaths_1.default)(program, {})]
                : undefined;
            for (const { sourceFile, source } of fileWriteQueue) {
                const outPath = pathTranslator.getOutputPath(sourceFile.fileName);
                if (!data.projectOptions.writeOnlyChanged ||
                    !fs_extra_1.default.pathExistsSync(outPath) ||
                    fs_extra_1.default.readFileSync(outPath).toString() !== source) {
                    fs_extra_1.default.outputFileSync(outPath, source);
                    emittedFiles.push(outPath);
                }
                if (compilerOptions.declaration) {
                    proxyProgram.emit(sourceFile, typescript_1.default.sys.writeFile, undefined, true, { afterDeclarations });
                }
            }
        });
    }
    program.emitBuildInfo();
    return { emittedFiles, emitSkipped: false, diagnostics: DiagnosticService_1.DiagnosticService.flush() };
}
//# sourceMappingURL=compileFiles.js.map