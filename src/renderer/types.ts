import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";
import type { DocirTheme } from "../schema/themeSchema.js";

export type OutputMode = "single" | "bundle" | "site";
export type RendererName = "plain" | "bootstrap" | "markdown";

export interface RenderContext {
  config: DocirConfig;
  theme?: DocirTheme;
  outputMode?: OutputMode;
  cssHref?: string;
}

export type Renderer = (doc: DocIR, context: RenderContext) => string;
