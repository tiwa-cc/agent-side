import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";

export interface RenderContext {
  config: DocirConfig;
}

export type Renderer = (doc: DocIR, context: RenderContext) => string;
