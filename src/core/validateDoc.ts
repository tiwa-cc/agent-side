import type { DocIR } from "../ast/types.js";
import type { DocirConfig } from "../config/configSchema.js";
import { docSchema } from "../schema/docSchema.js";

export function validateDoc(doc: DocIR, _config?: DocirConfig): DocIR {
  return docSchema.parse(doc) as DocIR;
}
