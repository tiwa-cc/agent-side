import { migrateMarkdownFile } from "../../migration/markdown.js";

export async function migrateMarkdownCommand(options: { input: string; out: string; title?: string; force?: boolean }): Promise<void> {
  const result = await migrateMarkdownFile({
    inputPath: options.input,
    outputPath: options.out,
    ...(options.title ? { title: options.title } : {}),
    ...(options.force ? { force: true } : {}),
  });

  for (const warning of result.warnings) {
    const location = warning.line !== undefined && warning.column !== undefined ? `:${warning.line}:${warning.column}` : "";
    console.error(`Warning${location}: ${warning.message}`);
  }
  console.log(`Migrated Markdown to ${options.out}`);
}
