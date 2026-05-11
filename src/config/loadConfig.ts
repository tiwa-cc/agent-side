import { readFile } from "node:fs/promises";
import { dirname, resolve } from "pathe";
import { parse } from "smol-toml";
import { configSchema, type DocirConfig } from "./configSchema.js";

export async function loadConfig(configPath = "docir.toml"): Promise<DocirConfig> {
  return (await loadConfigWithMeta(configPath)).config;
}

export interface LoadedConfig {
  config: DocirConfig;
  path: string;
  baseDir: string;
}

export async function loadConfigWithMeta(configPath = "docir.toml"): Promise<LoadedConfig> {
  const path = resolve(process.cwd(), configPath);
  const text = await readFile(path, "utf8");
  return {
    config: configSchema.parse(parse(text)),
    path,
    baseDir: dirname(path),
  };
}
