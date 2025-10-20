#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CLIError_1 = require("./errors/CLIError");
const LogService_1 = require("../Shared/classes/LogService");
const constants_1 = require("../Shared/constants");
const helpers_1 = require("yargs/helpers");
const yargs_1 = __importDefault(require("yargs/yargs"));
const cli = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv));
cli
    .usage("roblox-ts - A TypeScript-to-Luau Compiler for Roblox")
    .help("help")
    .alias("h", "help")
    .describe("help", "show help information")
    .version(constants_1.COMPILER_VERSION)
    .alias("v", "version")
    .describe("version", "show version information")
    .commandDir(`${constants_1.PACKAGE_ROOT}/out/CLI/commands`)
    .recommendCommands()
    .strict()
    .wrap(cli.terminalWidth())
    .fail(str => {
    process.exitCode = 1;
    if (str) {
        LogService_1.LogService.fatal(str);
    }
})
    .parseAsync()
    .catch(e => {
    if (e instanceof CLIError_1.CLIError) {
        e.log();
        debugger;
    }
    else {
        throw e;
    }
});
//# sourceMappingURL=cli.js.map