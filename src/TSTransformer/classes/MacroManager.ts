import luau from "@roblox-ts/luau-ast";
import path from "path";
import { ProjectError } from "Shared/errors/ProjectError";
import { assert } from "Shared/util/assert";
import { CALL_MACROS } from "TSTransformer/macros/callMacros";
import { CONSTRUCTOR_MACROS } from "TSTransformer/macros/constructorMacros";
import { IDENTIFIER_MACROS } from "TSTransformer/macros/identifierMacros";
import { PROPERTY_CALL_MACROS } from "TSTransformer/macros/propertyCallMacros";
import { CallMacro, ConstructorMacro, IdentifierMacro, PropertyCallMacro } from "TSTransformer/macros/types";
import { skipUpwards } from "TSTransformer/util/traversal";
import ts from "typescript";

function getType(typeChecker: ts.TypeChecker, node: ts.Node) {
	return typeChecker.getTypeAtLocation(skipUpwards(node));
}

const TYPES_NOTICE = "\nYou may need to update your @rbxts/compiler-types!";

export const SYMBOL_NAMES = {
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
} as const;

export const NOMINAL_LUA_TUPLE_NAME = "_nominal_LuaTuple";

const MACRO_ONLY_CLASSES = new Set<string>([
	SYMBOL_NAMES.ReadonlyArray,
	SYMBOL_NAMES.Array,
	SYMBOL_NAMES.ReadonlyMap,
	SYMBOL_NAMES.WeakMap,
	SYMBOL_NAMES.Map,
	SYMBOL_NAMES.ReadonlySet,
	SYMBOL_NAMES.WeakSet,
	SYMBOL_NAMES.Set,
	SYMBOL_NAMES.String,
]);

function getFirstDeclarationOrThrow<T extends ts.Node>(symbol: ts.Symbol, check: (value: ts.Node) => value is T): T {
	for (const declaration of symbol.declarations ?? []) {
		if (check(declaration)) {
			return declaration;
		}
	}
	throw new ProjectError("");
}

function getGlobalSymbolByNameOrThrow(typeChecker: ts.TypeChecker, name: string, meaning: ts.SymbolFlags, location?: ts.Node) {
	const symbol = typeChecker.resolveName(name, location, meaning, false);
	if (symbol) {
		return symbol;
	}
	throw new ProjectError(`MacroManager could not find symbol for ${name}` + TYPES_NOTICE);
}

function getConstructorSymbol(node: ts.InterfaceDeclaration) {
	for (const member of node.members) {
		if (ts.isConstructSignatureDeclaration(member)) {
			assert(member.symbol);
			return member.symbol;
		}
	}
	throw new ProjectError(`MacroManager could not find constructor for ${node.name.text}` + TYPES_NOTICE);
}

/**
 * Manages the macros of the ts.
 */
export class MacroManager {
	private symbols = new Map<string, ts.Symbol>();
	private identifierMacros = new Map<ts.Symbol, IdentifierMacro>();
	private callMacros = new Map<ts.Symbol, CallMacro>();
	private customCallMacros = new Map<ts.Symbol, CallMacro>();
	private constructorMacros = new Map<ts.Symbol, ConstructorMacro>();
	private propertyCallMacros = new Map<ts.Symbol, PropertyCallMacro>();
	private customPropertyCallMacros = new Map<ts.Symbol, PropertyCallMacro>();
	private readonly methodMap = new Map<string, Map<string, ts.Symbol>>();

	constructor(private readonly typeChecker: ts.TypeChecker) {
		for (const [name, macro] of Object.entries(IDENTIFIER_MACROS)) {
			const symbol = getGlobalSymbolByNameOrThrow(typeChecker, name, ts.SymbolFlags.Variable);
			this.identifierMacros.set(symbol, macro);
		}

		for (const [name, macro] of Object.entries(CALL_MACROS)) {
			const symbol = getGlobalSymbolByNameOrThrow(typeChecker, name, ts.SymbolFlags.Function);
			this.callMacros.set(symbol, macro);
		}

		for (const [className, macro] of Object.entries(CONSTRUCTOR_MACROS)) {
			const symbol = getGlobalSymbolByNameOrThrow(typeChecker, className, ts.SymbolFlags.Interface);
			const interfaceDec = getFirstDeclarationOrThrow(symbol, ts.isInterfaceDeclaration);
			const constructSymbol = getConstructorSymbol(interfaceDec);
			this.constructorMacros.set(constructSymbol, macro);
		}

		for (const [className, methods] of Object.entries(PROPERTY_CALL_MACROS)) {
			const symbol = getGlobalSymbolByNameOrThrow(typeChecker, className, ts.SymbolFlags.Interface);

			const methodMap = new Map<string, ts.Symbol>();
			for (const declaration of symbol.declarations ?? []) {
				if (ts.isInterfaceDeclaration(declaration)) {
					for (const member of declaration.members) {
						if (ts.isMethodSignature(member) && ts.isIdentifier(member.name)) {
							const symbol = getType(typeChecker, member).symbol;
							assert(symbol);
							methodMap.set(member.name.text, symbol);
						}
					}
				}
			}

			for (const [methodName, macro] of Object.entries(methods)) {
				const methodSymbol = methodMap.get(methodName);
				if (!methodSymbol) {
					throw new ProjectError(
						`MacroManager could not find method for ${className}.${methodName}` + TYPES_NOTICE,
					);
				}
				this.propertyCallMacros.set(methodSymbol, macro);
			}

			this.methodMap.set(symbol.name, methodMap);
		}

		for (const symbolName of Object.values(SYMBOL_NAMES)) {
			const symbol = typeChecker.resolveName(symbolName, undefined, ts.SymbolFlags.All, false);
			if (symbol) {
				this.symbols.set(symbolName, symbol);
			} else {
				throw new ProjectError(`MacroManager could not find symbol for ${symbolName}` + TYPES_NOTICE);
			}
		}

		const luaTupleTypeDec = this.symbols
			.get(SYMBOL_NAMES.LuaTuple)
			?.declarations?.find(v => ts.isTypeAliasDeclaration(v));
		if (luaTupleTypeDec) {
			const nominalLuaTupleSymbol = typeChecker
				.getTypeAtLocation(luaTupleTypeDec)
				.getProperty(NOMINAL_LUA_TUPLE_NAME);
			if (nominalLuaTupleSymbol) {
				this.symbols.set(NOMINAL_LUA_TUPLE_NAME, nominalLuaTupleSymbol);
			}
		}
	}

	public getSymbolOrThrow(name: string) {
		const symbol = this.symbols.get(name);
		assert(symbol);
		return symbol;
	}

	public isMacroOnlyClass(symbol: ts.Symbol) {
		return this.symbols.get(symbol.name) === symbol && MACRO_ONLY_CLASSES.has(symbol.name);
	}

	public getIdentifierMacro(symbol: ts.Symbol) {
		return this.identifierMacros.get(symbol);
	}

	public getCallMacro(symbol: ts.Symbol) {
		return this.callMacros.get(symbol) ?? this.customCallMacros.get(symbol);
	}

	public getConstructorMacro(symbol: ts.Symbol) {
		return this.constructorMacros.get(symbol);
	}

	public getPropertyCallMacro(symbol: ts.Symbol) {
		const macro = this.propertyCallMacros.get(symbol) ?? this.customPropertyCallMacros.get(symbol);
		if (
			!macro &&
			symbol.parent &&
			this.symbols.get(symbol.parent.name) === symbol.parent &&
			this.isMacroOnlyClass(symbol.parent)
		) {
			assert(false, `Macro ${symbol.parent.name}.${symbol.name}() is not implemented!`);
		}
		return macro;
	}

	public addCallMacrosFromFiles(files: ReadonlyArray<ts.SourceFile>) {
		const addMacro = (name: ts.Identifier, file: ts.SourceFile) => {
			const smb = getGlobalSymbolByNameOrThrow(this.typeChecker, name.text, ts.SymbolFlags.Function);
			const pth = path.relative("src", file.path);

			const macro: CallMacro = (state, node, expression, args) => {
				const identifier = state.customLib(node, pth, name.text, file);
				return luau.call(identifier, args);
			};

			this.customCallMacros.set(smb, macro);
		};
		const isExported = (node: ts.ModuleDeclaration | ts.FunctionDeclaration | ts.VariableStatement) =>
			node.modifiers?.find(ts.isExportModifier) !== undefined;

		for (const file of files) {
			if (!file.path.includes(".callmacro.")) continue;

			for (const statement of file.statements) {
				if (ts.isFunctionDeclaration(statement)) {
					if (!isExported(statement)) continue;
					if (!statement.name) continue;

					const name = statement.name;
					addMacro(name, file);
				}
			}
		}
	}
	public addPropertyMacrosFromFiles(files: ReadonlyArray<ts.SourceFile>) {
		const addInterfaceMethods = (declaration: ts.InterfaceDeclaration, methodMap: Map<string, ts.Symbol>) => {
			for (const member of declaration.members) {
				if (ts.isMethodSignature(member) && ts.isIdentifier(member.name)) {
					const symbol = getType(this.typeChecker, member).symbol;
					assert(symbol);
					methodMap.set(member.name.text, symbol);
				}
			}
		}
		const addMacro = (
			declarationName: ts.Identifier,
			propertyName: ts.Identifier,
			type: ts.Identifier,
			file: ts.SourceFile,
		) => {
			const smb = this.methodMap.get(type.text)?.get(propertyName.text);
			if (!smb) {
				throw new ProjectError(`MacroManager could not find symbol for ${type}.${propertyName.text}` + TYPES_NOTICE);
			}

			const pth = path.relative("src", file.path);

			const macro: CallMacro = (state, node, expression, args) => {
				const identifier =
					state.sourceFile.fileName === file.fileName
						? luau.create(luau.SyntaxKind.Identifier, { name: declarationName.text })
						: state.customLib(node, pth, declarationName.text, file);


				/*
				local result =
					if type(t) == "table" and t.enable ~= nil then
						t:enable()
					else
						Component2Macros.enable(t)
				*/

				const expr = state.pushToVar(expression);
				args = args.map(arg => state.pushToVarIfComplex(arg));

				return luau.create(luau.SyntaxKind.IfExpression, {
					condition: luau.binary(
						luau.binary(
							luau.call(
								luau.create(luau.SyntaxKind.Identifier, { name: "type" }),
								[expr],
							),
							"==",
							luau.string("table"),
						),
						"and",
						luau.binary(
							luau.property(expr, propertyName.text),
							"~=",
							luau.nil(),
						),
					),
					expression: luau.call(
						luau.property(expr, propertyName.text),
						[expr, ...args],
					),
					alternative: luau.call(
						luau.property(identifier, propertyName.text),
						[expr, ...args],
					),
				});
			};

			this.customPropertyCallMacros.set(smb, macro);
		};
		const isExported = (node: ts.ModuleDeclaration | ts.FunctionDeclaration | ts.VariableStatement) =>
			node.modifiers?.find(ts.isExportModifier) !== undefined;

		for (const file of files) {
			if (!file.path.includes(".propmacro.")) continue;

			for (const statement of file.statements) {
				if (ts.isModuleDeclaration(statement)) {
					if (statement.modifiers?.[0].kind !== ts.SyntaxKind.DeclareKeyword) continue;
					if (!statement.body || !ts.isModuleBlock(statement.body)) continue;

					for (const declaration of statement.body.statements) {
						if (!ts.isInterfaceDeclaration(declaration)) continue;

						const methodMap = this.methodMap.get(declaration.name.text) ?? new Map<string, ts.Symbol>();
						
						addInterfaceMethods(declaration, methodMap)
						this.methodMap.set(declaration.name.text, methodMap);
					}
				}
				else if (ts.isVariableStatement(statement)) {
					if (!isExported(statement)) continue;

					for (const declaration of statement.declarationList.declarations) {
						if (!ts.isIdentifier(declaration.name)) continue;

						if (!declaration.type || !ts.isTypeReferenceNode(declaration.type)) continue;
						if (!ts.isIdentifier(declaration.type.typeName)) continue;
						if (declaration.type.typeName.text !== "PropertyMacros") continue;
						if (!declaration.type.typeArguments) continue;
						if (declaration.type.typeArguments.length !== 1) continue;

						if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
							continue;
						}

						const type = declaration.type.typeArguments[0];
						if (!ts.isTypeReferenceNode(type)) continue;
						if (!ts.isIdentifier(type.typeName)) continue;

						const declarationName = declaration.name;

						for (const prop of declaration.initializer.properties) {
							if (!ts.isPropertyAssignment(prop)) continue;
							if (!prop.name || !ts.isIdentifier(prop.name)) continue;
							if (!ts.isArrowFunction(prop.initializer)) continue;

							addMacro(declarationName, prop.name, type.typeName, file);
						}
					}
				}
			}
		}
	}
}
