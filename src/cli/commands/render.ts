import { renderProject } from "../../core/renderProject.js";
import type { RenderProjectOptions } from "../../core/renderProject.js";
import { parseOutputMode } from "../outputMode.js";

export async function renderCommand(entry?: string, options: { out?: string; config?: string; mode?: string } = {}): Promise<void> {
  const renderOptions: RenderProjectOptions = {};
  if (options.config) renderOptions.configPath = options.config;
  if (entry) renderOptions.entry = entry;
  if (options.out) renderOptions.outDir = options.out;
  const mode = parseOutputMode(options.mode);
  if (mode) renderOptions.mode = mode;

  const result = await renderProject(renderOptions);
  console.log(`Rendered ${result.outFile}`);
  if (result.assetFiles.length > 0) console.log(`Assets: ${result.assetFiles.join(", ")}`);
}
