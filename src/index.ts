export { normalizeDoc } from "./ast/normalize.js";
export type { Block, DocIR } from "./ast/types.js";
export { loadConfig } from "./config/loadConfig.js";
export type { DocirConfig } from "./config/configSchema.js";
export { loadDoc } from "./loader/loadDoc.js";
export { blockSchema } from "./schema/blockSchemas.js";
export { docFileSchema, docSchema } from "./schema/docSchema.js";
export { renderBootstrapHtml, renderProject, validateDoc, validateProject } from "./core/index.js";
export type { LoadedProject, LoadProjectOptions, RenderProjectOptions, RenderProjectResult } from "./core/index.js";
