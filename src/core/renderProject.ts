import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import { renderBootstrapCss, renderDocument } from "../renderer/bootstrap/renderDocument.js";
import { renderMarkdownDocument } from "../renderer/markdown/renderDocument.js";
import { renderPlainCss, renderPlainDocument } from "../renderer/plain/renderDocument.js";
import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";
import type { DocirTheme } from "../schema/themeSchema.js";
import { loadProject, type LoadProjectOptions } from "./loadProject.js";
import type { OutputMode } from "../renderer/types.js";

export interface RenderProjectOptions extends LoadProjectOptions {
  outDir?: string;
  mode?: OutputMode;
}

export interface RenderProjectResult {
  html: string;
  outFile: string;
  mode: OutputMode;
  assetFiles: string[];
}

export async function renderProject(options: RenderProjectOptions = {}): Promise<RenderProjectResult> {
  const { config, doc, theme, baseDir } = await loadProject(options);
  const outDir = options.outDir ? resolve(process.cwd(), options.outDir) : resolve(baseDir, config.site.out_dir);
  const outFile = resolve(outDir, config.renderer.name === "markdown" ? "index.md" : "index.html");
  const mode = options.mode ?? config.renderer.output.mode;
  const assetFiles: string[] = [];
  const html = renderSelectedDocument(doc, config, theme, mode);

  await mkdir(outDir, { recursive: true });
  if (mode !== "single" && config.renderer.name !== "markdown") {
    const cssFile = resolve(outDir, "assets/agent-side.css");
    await mkdir(resolve(outDir, "assets"), { recursive: true });
    await writeFile(cssFile, renderSelectedCss(config, theme, mode), "utf8");
    assetFiles.push(cssFile);
  }
  await writeFile(outFile, html, "utf8");

  return { html, outFile, mode, assetFiles };
}

export function renderBootstrapHtml(doc: DocIR, config: DocirConfig, theme?: DocirTheme): string {
  return renderDocument(doc, theme ? { config, theme } : { config });
}

function renderSelectedDocument(doc: DocIR, config: DocirConfig, theme: DocirTheme, mode: OutputMode): string {
  if (config.renderer.name === "markdown") return renderMarkdownDocument(doc);
  if (config.renderer.name === "plain") {
    return renderPlainDocument(doc, mode === "single" ? { config, theme, outputMode: mode } : { config, theme, outputMode: mode, cssHref: "assets/agent-side.css" });
  }
  return renderDocument(doc, mode === "single" ? { config, theme, outputMode: mode } : { config, theme, outputMode: mode, cssHref: "assets/agent-side.css" });
}

function renderSelectedCss(config: DocirConfig, theme: DocirTheme, mode: OutputMode): string {
  if (config.renderer.name === "plain") return renderPlainCss();
  return renderBootstrapCss({ config, theme, outputMode: mode });
}
