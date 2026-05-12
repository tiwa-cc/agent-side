import { realpath } from "node:fs/promises";
import { dirname, isAbsolute, normalize, relative, resolve } from "pathe";
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
    const target = await realpathIfExists(normalized);
    const fromBase = relative(base, target);
    if (fromBase === ".." || fromBase.startsWith("../") || fromBase.startsWith("..\\")) {
      throw new DocirError(`Include escapes base_dir: ${src}`);
    }
  }

  return normalized;
}

async function realpathIfExists(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return normalize(resolve(path));
    }
    throw error;
  }
}
