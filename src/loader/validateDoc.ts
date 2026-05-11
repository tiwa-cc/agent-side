import { type Block, type DocIR } from "../ast/types.js";
import { type DocirConfig } from "../config/configSchema.js";
import { blockSchema } from "../schema/blockSchemas.js";
import { docFileSchema, docSchema } from "../schema/docSchema.js";
import { DocirError } from "../utils/errors.js";

export function validateDocValue(value: unknown, config: DocirConfig, source = "DocIR document"): DocIR {
  assertNoForbiddenPresentationKeys(value, source);
  const validationValue = validationValueFor(value, config);
  const candidate =
    validationValue && typeof validationValue === "object" && !Array.isArray(validationValue) && "page" in validationValue
      ? docFileSchema.safeParse(validationValue)
      : docSchema.safeParse(validationValue);

  if (!candidate.success) {
    throw new DocirError(`Invalid DocIR document in ${source}: ${formatIssues(candidate.error.issues)}`);
  }

  if (effectiveUnknownKeyPolicy(config) === "passthrough") {
    return normalizePassthroughDoc(value) as DocIR;
  }
  return candidate.data as DocIR;
}

export function validateBlockValue(value: unknown, config: DocirConfig, source: string, index: number): Block {
  assertNoForbiddenPresentationKeys(value, source);
  const validationValue = validationValueFor(value, config);
  const result = blockSchema.safeParse(validationValue);
  if (!result.success) {
    throw new DocirError(`Invalid included block in ${source} at index ${index}: ${formatIssues(result.error.issues)}`);
  }
  if (effectiveUnknownKeyPolicy(config) === "passthrough") return value as Block;
  return result.data as Block;
}

export function formatIssues(issues: Array<{ path: Array<string | number>; message: string }>): string {
  return issues.map((issue) => `${issue.path.join(".") || "block"} ${issue.message}`).join(", ");
}

function validationValueFor(value: unknown, config: DocirConfig): unknown {
  if (effectiveUnknownKeyPolicy(config) === "error") return value;
  return stripUnknownKeys(value);
}

function effectiveUnknownKeyPolicy(config: DocirConfig): "error" | "strip" | "passthrough" {
  if (!config.validation.strict && config.validation.unknown_keys === "error") return "passthrough";
  return config.validation.unknown_keys;
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

const itemKeys: Record<string, Record<string, Set<string>>> = {
  cards: { items: new Set(["title", "text", "body", "href", "badge"]) },
  keyValue: { items: new Set(["key", "value"]) },
  table: { columns: new Set(["key", "label"]) },
  todo: { items: new Set(["id", "title", "status", "priority"]) },
  checklist: { items: new Set(["label", "checked"]) },
  reference: { items: new Set(["label", "path"]) },
  fileTree: { items: new Set(["path", "description"]) },
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
    } else if (itemKeys[String(block.type)]?.[key] && Array.isArray(entry)) {
      const allowedItemKeys = itemKeys[String(block.type)]?.[key] ?? new Set();
      result[key] = entry.map((item) => (isRecord(item) ? stripObject(item, allowedItemKeys) : item));
    } else {
      result[key] = entry;
    }
  }
  return result;
}

function normalizePassthroughDoc(value: unknown): unknown {
  if (isRecord(value) && isRecord(value.page)) {
    const { page } = value;
    return {
      ...page,
      description: typeof page.description === "string" ? page.description : page.lead,
    };
  }
  return value;
}

function assertNoForbiddenPresentationKeys(value: unknown, source: string, path: Array<string | number> = []): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenPresentationKeys(item, source, [...path, index]));
    return;
  }
  if (!isRecord(value)) return;

  for (const key of Object.keys(value)) {
    if (["class", "style", "margin", "padding", "font-size", "color"].includes(key)) {
      throw new DocirError(`Invalid DocIR document in ${source}: ${[...path, key].join(".")} Presentation key "${key}" is not allowed`);
    }
  }
  for (const [key, entry] of Object.entries(value)) {
    assertNoForbiddenPresentationKeys(entry, source, [...path, key]);
  }
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
