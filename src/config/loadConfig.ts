import { readFile } from "node:fs/promises";
import { resolve } from "pathe";
import { parse } from "smol-toml";
import { configSchema, type DocirConfig } from "./configSchema.js";

export async function loadConfig(configPath = "docir.toml"): Promise<DocirConfig> {
  const text = await readFile(resolve(process.cwd(), configPath), "utf8");
  return configSchema.parse(parse(text));
}
