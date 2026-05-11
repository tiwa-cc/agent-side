import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { resolve } from "pathe";
import { type Block, type DocIR } from "../ast/types.js";
import { normalizeDoc } from "../ast/normalize.js";
import { type DocirConfig } from "../config/configSchema.js";
import { DocirError } from "../utils/errors.js";
import { resolveInclude } from "./resolveInclude.js";
import { validateBlockValue, validateDocValue } from "./validateDoc.js";

export interface LoadDocOptions {
  baseDir?: string;
}

export async function loadDoc(entry: string, config: DocirConfig, options: LoadDocOptions = {}): Promise<DocIR> {
  const rootDir = options.baseDir ?? process.cwd();
  const entryPath = resolve(rootDir, entry);
  return normalizeDoc(await loadDocFile(entryPath, config, [], rootDir));
}

async function loadDocFile(filePath: string, config: DocirConfig, stack: string[], rootDir: string): Promise<DocIR> {
  if (stack.includes(filePath)) {
    throw new DocirError(`Circular include detected: ${[...stack, filePath].join(" -> ")}`);
  }

  let raw: unknown;
  try {
    raw = parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new DocirError(`Failed to read or parse YAML: ${filePath}`, error);
  }

  const doc = validateDocValue(raw, config, filePath);
  return { ...doc, blocks: await resolveBlocks(doc.blocks, filePath, config, [...stack, filePath], rootDir) };
}

async function loadBlockFile(filePath: string, config: DocirConfig, stack: string[], rootDir: string): Promise<Block[]> {
  if (stack.includes(filePath)) {
    throw new DocirError(`Circular include detected: ${[...stack, filePath].join(" -> ")}`);
  }

  let raw: unknown;
  try {
    raw = parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new DocirError(`Failed to read or parse included YAML: ${filePath}`, error);
  }

  const blocks = Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null && "blocks" in raw ? (raw as { blocks: unknown }).blocks : [raw];
  const parsed = zodBlocks(blocks, filePath, config);
  return resolveBlocks(parsed, filePath, config, [...stack, filePath], rootDir);
}

function zodBlocks(value: unknown, filePath: string, config: DocirConfig): Block[] {
  if (!Array.isArray(value)) throw new DocirError(`Included file must contain a block or blocks array: ${filePath}`);
  return value.map((item, index) => validateBlockValue(item, config, filePath, index));
}

async function resolveBlocks(blocks: Block[], fromFile: string, config: DocirConfig, stack: string[], rootDir: string): Promise<Block[]> {
  const resolved: Block[] = [];
  for (const block of blocks) {
    if (block.type === "include") {
      const includePath = await resolveInclude(fromFile, block.src, {
        rootDir,
        baseDir: config.include.base_dir,
        allowParent: config.include.allow_parent,
      });
      resolved.push(...(await loadBlockFile(includePath, config, stack, rootDir)));
    } else if (block.type === "section") {
      resolved.push({ ...block, blocks: await resolveBlocks(block.blocks, fromFile, config, stack, rootDir) });
    } else {
      resolved.push(block);
    }
  }
  return resolved;
}
