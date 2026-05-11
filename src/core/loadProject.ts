import { loadConfig } from "../config/loadConfig.js";
import { loadDoc } from "../loader/loadDoc.js";
import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";

export interface LoadProjectOptions {
  configPath?: string;
  entry?: string;
}

export interface LoadedProject {
  config: DocirConfig;
  doc: DocIR;
}

export async function loadProject(options: LoadProjectOptions = {}): Promise<LoadedProject> {
  const config = await loadConfig(options.configPath);
  const doc = await loadDoc(options.entry ?? config.site.entry, config);
  return { config, doc };
}
