import { loadConfigWithMeta } from "../config/loadConfig.js";
import { loadThemeFrom } from "../config/loadTheme.js";
import { loadDoc } from "../loader/loadDoc.js";
import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";
import type { DocirTheme } from "../schema/themeSchema.js";

export interface LoadProjectOptions {
  configPath?: string;
  entry?: string;
}

export interface LoadedProject {
  config: DocirConfig;
  doc: DocIR;
  theme: DocirTheme;
  baseDir: string;
}

export async function loadProject(options: LoadProjectOptions = {}): Promise<LoadedProject> {
  const { config, baseDir } = await loadConfigWithMeta(options.configPath);
  const theme = await loadThemeFrom(config.theme.path, baseDir);
  if (theme.name !== config.renderer.theme) {
    throw new Error(`Configured renderer.theme "${config.renderer.theme}" does not match loaded theme "${theme.name}"`);
  }
  const doc = await loadDoc(options.entry ?? config.site.entry, config, { baseDir });
  return { config, doc, theme, baseDir };
}
