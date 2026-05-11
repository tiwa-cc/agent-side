import { renderProject } from "../../core/renderProject.js";
import type { RenderProjectOptions } from "../../core/renderProject.js";

export async function renderCommand(entry?: string, options: { out?: string; config?: string } = {}): Promise<void> {
  const renderOptions: RenderProjectOptions = {};
  if (options.config) renderOptions.configPath = options.config;
  if (entry) renderOptions.entry = entry;
  if (options.out) renderOptions.outDir = options.out;

  const result = await renderProject(renderOptions);
  console.log(`Rendered ${result.outFile}`);
}
