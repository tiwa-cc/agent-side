#!/usr/bin/env node
import { Command } from "commander";
import { formatError } from "../utils/errors.js";
import { renderCommand } from "./commands/render.js";
import { validateCommand } from "./commands/validate.js";
import { previewCommand } from "./commands/preview.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

program.name("agent-side").description("Render YAML DocIR documents to readable HTML").version("0.1.0");

program
  .command("init")
  .option("-t, --target <dir>", "target directory", ".")
  .action((options) => run(() => initCommand(options)));

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
  .option("-m, --mode <mode>", "output mode: single, bundle, or site")
  .action((entry, options) => run(() => renderCommand(entry, options)));

program
  .command("preview")
  .argument("[entry]", "DocIR entry YAML")
  .option("-o, --out <dir>", "output directory")
  .option("-c, --config <path>", "config path", "docir.toml")
  .option("-m, --mode <mode>", "output mode: single, bundle, or site")
  .option("-p, --port <port>", "preview port", "4173")
  .action((entry, options) => run(() => previewCommand(entry, options)));

program.addHelpText(
  "after",
  `

Examples:
  $ agent-side init
  $ agent-side validate docs/index.yml
  $ agent-side render docs/index.yml --out dist
  $ agent-side preview

DocIR:
  agent-side uses YAML DocIR as its document DSL.
  Run "agent-side init" to create a minimal sample.
  See repository samples for more examples:
  https://github.com/tiwa-cc/agent-side
`,
);

await program.parseAsync(process.argv);

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(formatError(error));
    process.exitCode = 1;
  }
}
