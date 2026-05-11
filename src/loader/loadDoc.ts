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

  const doc = parseDocFile(applyUnknownKeyPolicy(raw, config), filePath);
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

  const filteredRaw = applyUnknownKeyPolicy(raw, config);
  const blocks = Array.isArray(filteredRaw) ? filteredRaw : typeof filteredRaw === "object" && filteredRaw !== null && "blocks" in filteredRaw ? (filteredRaw as { blocks: unknown }).blocks : [filteredRaw];
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

function applyUnknownKeyPolicy(value: unknown, config: DocirConfig): unknown {
  if (config.validation.unknown_keys === "error") return value;
  return stripUnknownKeys(value);
}

const docKeys = new Set(["title", "lang", "description", "lead", "blocks", "page"]);
const baseBlockKeys = new Set(["type", "title", "layout", "width", "align", "tone", "priority"]);
const blockKeys: Record<string, Set<string>> = {
  include: new Set(["src"]),
  section: new Set(["blocks"]),
  paragraph: new Set(["text"]),
  summary: new Set(["body"]),
  points: new Set(["items"]),
  list: new Set(["items", "ordered"]),
  notice: new Set(["text", "body"]),
  decision: new Set(["decision", "rationale"]),
  risk: new Set(["risk", "impact", "mitigation"]),
  compare: new Set(["options", "items"]),
  cards: new Set(["items"]),
  table: new Set(["columns", "rows"]),
  code: new Set(["language", "code"]),
  mermaid: new Set(["diagram"]),
  keyValue: new Set(["items"]),
  constraint: new Set(["items"]),
  assumption: new Set(["items"]),
  openQuestion: new Set(["question", "context"]),
  command: new Set(["shell", "command"]),
  output: new Set(["body"]),
  todo: new Set(["items"]),
  issue: new Set(["body"]),
  checklist: new Set(["items"]),
  quote: new Set(["body"]),
  reference: new Set(["items"]),
  fileTree: new Set(["root", "items"]),
};

function stripUnknownKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUnknownKeys);
  if (!isRecord(value)) return value;

  if ("page" in value && isRecord(value.page)) {
    return { page: stripObject(value.page, docKeys) };
  }
  if ("type" in value && typeof value.type === "string") {
    return stripBlock(value);
  }
  return stripObject(value, docKeys);
}

function stripBlock(block: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set([...baseBlockKeys, ...(blockKeys[String(block.type)] ?? [])]);
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(block)) {
    if (!allowed.has(key)) continue;
    if (key === "blocks") {
      result[key] = stripUnknownKeys(entry);
    } else {
      result[key] = entry;
    }
  }
  return result;
}

function stripObject(value: Record<string, unknown>, allowed: Set<string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (allowed.has(key)) result[key] = stripUnknownKeys(entry);
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
