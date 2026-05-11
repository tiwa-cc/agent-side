import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";
import type { DocirTheme } from "../schema/themeSchema.js";

export interface RenderContext {
  config: DocirConfig;
  theme?: DocirTheme;
}

export type Renderer = (doc: DocIR, context: RenderContext) => string;
