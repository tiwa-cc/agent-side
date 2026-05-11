#!/usr/bin/env node
import { Command } from "commander";
import { formatError } from "../utils/errors.js";
import { renderCommand } from "./commands/render.js";
import { validateCommand } from "./commands/validate.js";
import { previewCommand } from "./commands/preview.js";

const program = new Command();

program.name("agent-side").description("Render YAML DocIR documents to readable HTML").version("0.1.0");

program
  .command("validate")
  .argument("[entry]", "DocIR entry YAML")
  .option("-c, --config <path>", "config path", "docir.toml")
  .action((entry, options) => run(() => validateCommand(entry, options)));

program
  .command("render")
  .argument("[entry]", "DocIR entry YAML")
  .option("-o, --out <dir>", "output directory")
  .option("-c, --config <path>", "config path", "docir.toml")
  .action((entry, options) => run(() => renderCommand(entry, options)));

program
  .command("preview")
  .argument("[entry]", "DocIR entry YAML")
  .option("-o, --out <dir>", "output directory")
  .option("-c, --config <path>", "config path", "docir.toml")
  .action((entry, options) => run(() => previewCommand(entry, options)));

await program.parseAsync(process.argv);

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(formatError(error));
    process.exitCode = 1;
  }
}
