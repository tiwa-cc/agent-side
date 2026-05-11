import { realpath } from "node:fs/promises";
import { dirname, isAbsolute, normalize, resolve } from "pathe";
import { DocirError } from "../utils/errors.js";

export interface IncludeResolverOptions {
  rootDir: string;
  baseDir: string;
  allowParent: boolean;
}

export async function resolveInclude(
  fromFile: string,
  src: string,
  options: IncludeResolverOptions,
): Promise<string> {
  const candidate = isAbsolute(src) ? src : resolve(dirname(fromFile), src);
  const normalized = normalize(candidate);

  if (!options.allowParent) {
    const base = await realpath(resolve(options.rootDir, options.baseDir));
    const target = normalize(resolve(normalized));
    if (!target.startsWith(base)) {
      throw new DocirError(`Include escapes base_dir: ${src}`);
    }
  }

  return normalized;
}
