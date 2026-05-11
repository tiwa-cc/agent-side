import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";
import { validateDocValue } from "../loader/validateDoc.js";

export function validateDoc(doc: unknown, config: DocirConfig): DocIR {
  return validateDocValue(doc, config);
}
