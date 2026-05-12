import type { OutputMode } from "../renderer/types.js";

export function parseOutputMode(value: string | undefined): OutputMode | undefined {
  if (value === undefined) return undefined;
  if (value === "single" || value === "bundle" || value === "site") return value;
  throw new Error(`Invalid output mode "${value}". Expected one of: single, bundle, site`);
}
