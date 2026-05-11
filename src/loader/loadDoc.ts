import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { resolve } from "pathe";
import { type Block, type DocIR } from "../ast/types.js";
import { normalizeDoc } from "../ast/normalize.js";
import { docFileSchema, docSchema } from "../schema/docSchema.js";
import { blockSchema } from "../schema/blockSchemas.js";
import { type DocirConfig } from "../config/configSchema.js";
import { DocirError } from "../utils/errors.js";
import { resolveInclude } from "./resolveInclude.js";

export async function loadDoc(entry: string, config: DocirConfig): Promise<DocIR> {
  const rootDir = process.cwd();
  const entryPath = resolve(rootDir, entry);
  return normalizeDoc(await loadDocFile(entryPath, config, []));
}

async function loadDocFile(filePath: string, config: DocirConfig, stack: string[]): Promise<DocIR> {
  if (stack.includes(filePath)) {
    throw new DocirError(`Circular include detected: ${[...stack, filePath].join(" -> ")}`);
  }

  let raw: unknown;
  try {
    raw = parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new DocirError(`Failed to read or parse YAML: ${filePath}`, error);
  }

  const doc = parseDocFile(raw, filePath);
  return { ...doc, blocks: await resolveBlocks(doc.blocks, filePath, config, [...stack, filePath]) };
}

async function loadBlockFile(filePath: string, config: DocirConfig, stack: string[]): Promise<Block[]> {
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
  const parsed = zodBlocks(blocks, filePath);
  return resolveBlocks(parsed, filePath, config, [...stack, filePath]);
}

function zodBlocks(value: unknown, filePath: string): Block[] {
  if (!Array.isArray(value)) throw new DocirError(`Included file must contain a block or blocks array: ${filePath}`);
  return value.map((item, index) => parseBlock(item, filePath, index));
}

function parseDocFile(value: unknown, filePath: string): DocIR {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value) && "page" in value
      ? docFileSchema.safeParse(value)
      : docSchema.safeParse(value);
  if (!candidate.success) {
    throw new DocirError(`Invalid DocIR document in ${filePath}: ${formatIssues(candidate.error.issues)}`);
  }
  return candidate.data as DocIR;
}

function parseBlock(value: unknown, filePath: string, index: number): Block {
  const result = blockSchema.safeParse(value);
  if (!result.success) {
    throw new DocirError(`Invalid included block in ${filePath} at index ${index}: ${formatIssues(result.error.issues)}`);
  }
  return result.data as Block;
}

function formatIssues(issues: Array<{ path: Array<string | number>; message: string }>): string {
  return issues.map((issue) => `${issue.path.join(".") || "block"} ${issue.message}`).join(", ");
}

async function resolveBlocks(blocks: Block[], fromFile: string, config: DocirConfig, stack: string[]): Promise<Block[]> {
  const resolved: Block[] = [];
  for (const block of blocks) {
    if (block.type === "include") {
      const includePath = await resolveInclude(fromFile, block.src, {
        rootDir: process.cwd(),
        baseDir: config.include.base_dir,
        allowParent: config.include.allow_parent,
      });
      resolved.push(...(await loadBlockFile(includePath, config, stack)));
    } else if (block.type === "section") {
      resolved.push({ ...block, blocks: await resolveBlocks(block.blocks, fromFile, config, stack) });
    } else {
      resolved.push(block);
    }
  }
  return resolved;
}
