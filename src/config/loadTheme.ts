import { readFile } from "node:fs/promises";
import { resolve } from "pathe";
import { parse } from "yaml";
import { type DocirTheme, themeSchema } from "../schema/themeSchema.js";
import { DocirError } from "../utils/errors.js";

export async function loadTheme(themePath: string): Promise<DocirTheme> {
  return loadThemeFrom(themePath, process.cwd());
}

export async function loadThemeFrom(themePath: string, baseDir: string): Promise<DocirTheme> {
  const absolutePath = resolve(baseDir, themePath);
  try {
    return themeSchema.parse(parse(await readFile(absolutePath, "utf8")));
  } catch (error) {
    throw new DocirError(`Failed to load theme: ${absolutePath}`, error);
  }
}
