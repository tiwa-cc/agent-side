import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "pathe";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { stringify as stringifyYaml } from "yaml";
import type { Block, DocIR, InlineNode, RichText, TableCell } from "../ast/types.js";
import { docSchema } from "../schema/docSchema.js";
import { safeHref } from "../renderer/shared.js";

export interface MarkdownMigrationOptions {
  sourcePath?: string;
  title?: string;
}

export interface MarkdownMigrationWarning {
  message: string;
  line?: number;
  column?: number;
}

export interface MarkdownMigrationResult {
  doc: DocIR;
  warnings: MarkdownMigrationWarning[];
}

export interface MigrateMarkdownFileOptions extends MarkdownMigrationOptions {
  inputPath: string;
  outputPath: string;
  force?: boolean;
}

interface HastPosition {
  start?: { line?: number; column?: number };
}

interface HastText {
  type: "text";
  value: string;
  position?: HastPosition;
}

interface HastComment {
  type: "comment";
  value: string;
  position?: HastPosition;
}

interface HastElement {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: HastNode[];
  position?: HastPosition;
}

interface HastRoot {
  type: "root";
  children: HastNode[];
  position?: HastPosition;
}

type HastNode = HastRoot | HastText | HastComment | HastElement | { type: string; position?: HastPosition; [key: string]: unknown };

interface SectionEntry {
  level: number;
  block: Extract<Block, { type: "section" }>;
}

const markdownProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);

export function migrateMarkdown(source: string, options: MarkdownMigrationOptions = {}): MarkdownMigrationResult {
  const warnings: MarkdownMigrationWarning[] = [];
  const tree = markdownProcessor.runSync(markdownProcessor.parse(source)) as unknown as HastRoot;
  const firstH1 = findFirstHeading(tree.children, 1);
  const firstH1Title = firstH1 ? plainText(firstH1) : "";
  const explicitTitle = options.title?.trim();
  const title = explicitTitle || firstH1Title || fallbackTitle(options.sourcePath);
  const blocks = convertRoot(tree, warnings, firstH1, !explicitTitle);
  const doc = docSchema.parse({ title, blocks }) as DocIR;
  return { doc, warnings };
}

export async function migrateMarkdownFile(options: MigrateMarkdownFileOptions): Promise<MarkdownMigrationResult> {
  const inputPath = resolve(process.cwd(), options.inputPath);
  const outputPath = resolve(process.cwd(), options.outputPath);

  if (!options.force) {
    let outputExists = false;
    try {
      await access(outputPath);
      outputExists = true;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
    if (outputExists) throw new Error(`Output file already exists: ${outputPath}. Use --force to overwrite it.`);
  }

  const source = await readFile(inputPath, "utf8");
  const result = migrateMarkdown(source, { ...options, sourcePath: options.sourcePath ?? inputPath });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, stringifyYaml(result.doc, { lineWidth: 0 }), "utf8");
  return result;
}

function convertRoot(root: HastRoot, warnings: MarkdownMigrationWarning[], firstH1: HastElement | undefined, consumeFirstH1: boolean): Block[] {
  const blocks: Block[] = [];
  const sections: SectionEntry[] = [];
  let firstH1Consumed = false;

  for (const node of root.children) {
    if (isElement(node) && headingLevel(node) !== undefined) {
      const level = headingLevel(node) ?? 2;
      if (consumeFirstH1 && node === firstH1 && !firstH1Consumed) {
        firstH1Consumed = true;
        continue;
      }
      if (level === 1) {
        addWarning(warnings, node, "Additional h1 heading was converted to a root section.");
      }
      const section: Extract<Block, { type: "section" }> = { type: "section", title: plainText(node), blocks: [] };
      while (sections.length > 0 && (sections.at(-1)?.level ?? 0) >= level) sections.pop();
      const parent = sections.at(-1)?.block;
      if (parent) parent.blocks.push(section);
      else blocks.push(section);
      sections.push({ level, block: section });
      continue;
    }

    const block = convertBlock(node, warnings);
    if (!block) continue;
    const parent = sections.at(-1)?.block;
    if (parent) parent.blocks.push(block);
    else blocks.push(block);
  }

  return blocks;
}

function convertBlock(node: HastNode, warnings: MarkdownMigrationWarning[]): Block | undefined {
  if (!isElement(node)) {
    if (isText(node) && node.value.trim()) return { type: "paragraph", text: node.value.trim() };
    if (node.type === "comment") addWarning(warnings, node, "HTML comments were ignored during migration.");
    return undefined;
  }

  switch (node.tagName) {
    case "p":
      return { type: "paragraph", text: richText(node.children, warnings) };
    case "ul":
    case "ol":
      return convertList(node, warnings);
    case "blockquote":
      return { type: "quote", body: richTextFromParagraphChildren(node.children, warnings) };
    case "pre":
      return convertCode(node);
    case "table":
      return convertTable(node, warnings);
    case "hr":
      addWarning(warnings, node, "Horizontal rules were represented as plain text.");
      return { type: "paragraph", text: "---" };
    default:
      addWarning(warnings, node, `Unsupported HTML element <${node.tagName}> was converted to safe text.`);
      return { type: "paragraph", text: richText(node.children, warnings) };
  }
}

function convertList(node: HastElement, warnings: MarkdownMigrationWarning[]): Block {
  const items = node.children.filter(isElement).filter((child) => child.tagName === "li");
  const converted = items.map((item) => convertListItem(item, warnings));
  const hasTask = converted.some((item) => item.checked !== undefined);
  const allTasks = converted.length > 0 && converted.every((item) => item.checked !== undefined);

  if (allTasks) {
    return {
      type: "checklist",
      items: converted.map((item) => ({ label: item.text, checked: item.checked })),
    };
  }

  if (hasTask) addWarning(warnings, node, "Mixed task and regular list items were represented as a normal list.");
  return {
    type: "list",
    ordered: node.tagName === "ol",
    items: converted.map((item) => (item.checked === undefined ? item.text : prefixTask(item.text, item.checked))),
  };
}

function convertListItem(node: HastElement, warnings: MarkdownMigrationWarning[]): { text: RichText; checked?: boolean } {
  const children = [...node.children];
  const input = children.find((child) => isElement(child) && child.tagName === "input" && propertyString(child.properties.type) === "checkbox");
  const checked = input && isElement(input) ? input.properties.checked === true : undefined;
  const inlineChildren = children.filter((child) => !(isElement(child) && (child.tagName === "input" || child.tagName === "ul" || child.tagName === "ol")));
  const nested = children.find((child): child is HastElement => isElement(child) && (child.tagName === "ul" || child.tagName === "ol"));
  let text = richText(inlineChildren, warnings);

  if (input) text = trimTaskPrefix(text);
  if (nested) {
    addWarning(warnings, nested, "Nested list content was flattened into its parent list item.");
    const nestedText = flattenNestedList(nested, warnings);
    text = appendRichText(text, nestedText, "\n");
  }

  return checked === undefined ? { text } : { text, checked };
}

function flattenNestedList(node: HastElement, warnings: MarkdownMigrationWarning[]): RichText {
  const items = node.children.filter(isElement).filter((child) => child.tagName === "li");
  return items.reduce<RichText>((result, item, index) => {
    const converted = convertListItem(item, warnings);
    const itemText = converted.checked === undefined ? converted.text : prefixTask(converted.text, converted.checked);
    return appendRichText(result, itemText, index === 0 ? "" : "\n");
  }, "");
}

function convertCode(node: HastElement): Block {
  const code = node.children.find(isElement) ?? node;
  const language = propertyString(code.properties?.className)?.match(/(?:^|\s)language-([^\s]+)/)?.[1];
  const value = plainText(code).replace(/\n$/, "");
  return language ? { type: "code", language, code: value } : { type: "code", code: value };
}

function convertTable(node: HastElement, warnings: MarkdownMigrationWarning[]): Block {
  const headerRow = findFirstElement(node, "thead", "tr") ?? findFirstElement(node, "tr");
  const headerCells = headerRow?.children.filter(isElement).filter((cell) => cell.tagName === "th" || cell.tagName === "td") ?? [];
  if (headerCells.length === 0) {
    addWarning(warnings, node, "Table has no header row and was converted to an empty table.");
    return { type: "table", columns: [{ key: "column-1", label: "Column 1" }], rows: [] };
  }

  const usedKeys = new Map<string, number>();
  const columns = headerCells.map((cell, index) => {
    const label = plainText(cell) || `Column ${index + 1}`;
    const baseKey = slugify(label) || `column-${index + 1}`;
    const count = (usedKeys.get(baseKey) ?? 0) + 1;
    usedKeys.set(baseKey, count);
    return { key: count === 1 ? baseKey : `${baseKey}-${count}`, label };
  });

  const body = findFirstElement(node, "tbody");
  const rows = body?.children.filter(isElement).filter((row) => row.tagName === "tr") ?? [];
  return {
    type: "table",
    columns,
    rows: rows.map((row) => {
      const cells = row.children.filter(isElement).filter((cell) => cell.tagName === "td" || cell.tagName === "th");
      const record: Record<string, TableCell> = {};
      columns.forEach((column, index) => {
        record[column.key] = cells[index] ? richText(cells[index].children, warnings) : "";
      });
      return record;
    }),
  };
}

function richTextFromParagraphChildren(children: HastNode[], warnings: MarkdownMigrationWarning[]): RichText {
  const paragraphs = children.filter((child): child is HastElement => isElement(child) && child.tagName === "p");
  if (paragraphs.length === 0) return richText(children, warnings);
  return paragraphs.reduce<RichText>((result, paragraph, index) => {
    const current = richText(paragraph.children, warnings);
    return index === 0 ? current : appendRichText(result, current, "\n\n");
  }, "");
}

function richText(children: HastNode[], warnings: MarkdownMigrationWarning[]): RichText {
  const nodes: InlineNode[] = [];
  for (const child of children) appendInline(nodes, child, warnings);
  const merged = mergeTextNodes(nodes);
  if (merged.length === 0) return "";
  if (merged.length === 1 && merged[0]?.type === "text") return merged[0].text;
  return merged;
}

function appendInline(target: InlineNode[], node: HastNode, warnings: MarkdownMigrationWarning[]): void {
  if (isText(node)) {
    if (node.value) target.push({ type: "text", text: node.value });
    return;
  }
  if (node.type === "comment") {
    addWarning(warnings, node, "HTML comments were ignored during migration.");
    return;
  }
  if (!isElement(node)) {
    addWarning(warnings, node, `Unsupported Markdown node "${node.type}" was converted to safe text.`);
    return;
  }

  warnProperties(node, warnings, allowedPropertiesFor(node.tagName));
  const children = () => richTextNodes(node.children, warnings);
  switch (node.tagName) {
    case "strong":
    case "b": {
      const nested = children();
      if (nested.length > 0) target.push({ type: "strong", children: nested });
      return;
    }
    case "em":
    case "i": {
      const nested = children();
      if (nested.length > 0) target.push({ type: "em", children: nested });
      return;
    }
    case "del":
    case "s":
    case "strike": {
      const nested = children();
      if (nested.length > 0) target.push({ type: "del", children: nested });
      return;
    }
    case "code":
      target.push({ type: "inlineCode", text: plainText(node) });
      return;
    case "a": {
      const href = propertyString(node.properties.href);
      const safe = safeHref(href);
      const nested = children();
      if (!safe) {
        addWarning(warnings, node, "Unsafe link destination was converted to link text.");
        target.push(...nested);
        return;
      }
      if (nested.length === 0) return;
      const title = propertyString(node.properties.title);
      target.push(title ? { type: "link", href: safe, title, children: nested } : { type: "link", href: safe, children: nested });
      return;
    }
    case "br":
      target.push({ type: "break" });
      return;
    case "img": {
      const src = safeHref(propertyString(node.properties.src));
      const alt = propertyString(node.properties.alt) ?? "";
      if (!src) {
        addWarning(warnings, node, "Unsafe image source was converted to alt text.");
        target.push({ type: "text", text: alt });
        return;
      }
      const title = propertyString(node.properties.title);
      target.push(title ? { type: "image", src, alt, title } : { type: "image", src, alt });
      return;
    }
    case "input":
      return;
    default:
      addWarning(warnings, node, `Unsupported HTML element <${node.tagName}> was converted to its safe text content.`);
      target.push(...children());
  }
}

function richTextNodes(children: HastNode[], warnings: MarkdownMigrationWarning[]): InlineNode[] {
  const nodes: InlineNode[] = [];
  for (const child of children) appendInline(nodes, child, warnings);
  return mergeTextNodes(nodes);
}

function mergeTextNodes(nodes: InlineNode[]): InlineNode[] {
  const merged: InlineNode[] = [];
  for (const node of nodes) {
    const previous = merged.at(-1);
    if (node.type === "text" && previous?.type === "text") previous.text += node.text;
    else if (node.type !== "text" || node.text) merged.push(node);
  }
  return merged;
}

function trimTaskPrefix(value: RichText): RichText {
  if (typeof value === "string") return value.replace(/^\s+/, "");
  const nodes = value.map((node) => ({ ...node }));
  const first = nodes[0];
  if (first?.type === "text") first.text = first.text.replace(/^\s+/, "");
  return nodes;
}

function prefixTask(value: RichText, checked: boolean): RichText {
  const prefix: InlineNode = { type: "text", text: checked ? "[x] " : "[ ] " };
  return typeof value === "string" ? `${prefix.text}${value}` : [prefix, ...value];
}

function appendRichText(value: RichText, next: RichText, separator: string): RichText {
  const left = typeof value === "string" ? (value ? [{ type: "text", text: value } satisfies InlineNode] : []) : [...value];
  const right = typeof next === "string" ? (next ? [{ type: "text", text: next } satisfies InlineNode] : []) : [...next];
  if (separator) left.push({ type: "text", text: separator });
  const merged = mergeTextNodes([...left, ...right]);
  return merged.length === 1 && merged[0]?.type === "text" ? merged[0].text : merged;
}

function findFirstHeading(children: HastNode[], level: number): HastElement | undefined {
  return children.find((child) => isElement(child) && headingLevel(child) === level) as HastElement | undefined;
}

function findFirstElement(parent: HastElement, ...tags: string[]): HastElement | undefined {
  let current: HastElement | undefined = parent;
  for (const tag of tags) {
    current = current.children.find((child) => isElement(child) && child.tagName === tag) as HastElement | undefined;
    if (!current) return undefined;
  }
  return current;
}

function headingLevel(node: HastElement): number | undefined {
  return /^h[1-6]$/.test(node.tagName) ? Number(node.tagName.slice(1)) : undefined;
}

function plainText(node: HastNode): string {
  if (isText(node)) return node.value;
  if (isElement(node) && node.tagName === "br") return "\n";
  if (isElement(node) && node.tagName === "img") return propertyString(node.properties.alt) ?? "";
  if (isElement(node) || isRoot(node)) return node.children.map((child) => plainText(child)).join("");
  return "";
}

function fallbackTitle(sourcePath: string | undefined): string {
  if (!sourcePath) return "Imported document";
  const name = basename(sourcePath, extname(sourcePath)).trim();
  return name || "Imported document";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function propertyString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean");
    return first === undefined ? undefined : String(first);
  }
  return undefined;
}

function allowedPropertiesFor(tagName: string): Set<string> {
  if (tagName === "a") return new Set(["href", "title"]);
  if (tagName === "img") return new Set(["src", "alt", "title"]);
  if (tagName === "input") return new Set(["type", "checked", "disabled"]);
  return new Set();
}

function warnProperties(node: HastElement, warnings: MarkdownMigrationWarning[], allowed = new Set<string>()): void {
  for (const key of Object.keys(node.properties)) {
    if (!allowed.has(key)) addWarning(warnings, node, `HTML attribute "${key}" was ignored.`);
  }
}

function addWarning(warnings: MarkdownMigrationWarning[], node: { position?: HastPosition }, message: string): void {
  const start = node.position?.start;
  warnings.push(start?.line !== undefined && start.column !== undefined ? { message, line: start.line, column: start.column } : { message });
}

function isElement(node: HastNode): node is HastElement {
  return node.type === "element" && typeof (node as HastElement).tagName === "string";
}

function isText(node: HastNode): node is HastText {
  return node.type === "text" && typeof (node as HastText).value === "string";
}

function isRoot(node: HastNode): node is HastRoot {
  return node.type === "root" && Array.isArray((node as HastRoot).children);
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}
