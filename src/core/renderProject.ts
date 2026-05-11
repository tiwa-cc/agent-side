import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import { renderDocument } from "../renderer/bootstrap/renderDocument.js";
import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";
import type { DocirTheme } from "../schema/themeSchema.js";
import { loadProject, type LoadProjectOptions } from "./loadProject.js";

export interface RenderProjectOptions extends LoadProjectOptions {
  outDir?: string;
}

export interface RenderProjectResult {
  html: string;
  outFile: string;
}

export async function renderProject(options: RenderProjectOptions = {}): Promise<RenderProjectResult> {
  const { config, doc, theme } = await loadProject(options);
  const outDir = resolve(process.cwd(), options.outDir ?? config.site.out_dir);
  const outFile = resolve(outDir, "index.html");
  const html = renderDocument(doc, { config, theme });

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, html, "utf8");

  return { html, outFile };
}

export function renderBootstrapHtml(doc: DocIR, config: DocirConfig, theme?: DocirTheme): string {
  return renderDocument(doc, theme ? { config, theme } : { config });
}
