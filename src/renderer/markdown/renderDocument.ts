import type { Block, DocIR, TableBlock } from "../../ast/types.js";
import { asArray, objectRecord, safeHref, stringify } from "../shared.js";
import { renderInlineMarkdown } from "../inline.js";

export function renderMarkdownDocument(doc: DocIR): string {
  return [`# ${escapeInline(doc.title)}`, doc.description ? escapeText(doc.description) : "", ...doc.blocks.map((block) => renderMarkdownBlock(block, 2))]
    .filter(Boolean)
    .join("\n\n")
    .trimEnd()
    .concat("\n");
}

function renderMarkdownBlock(block: Block, level: number): string {
  switch (block.type) {
    case "section":
      return [heading(block.title, level), ...block.blocks.map((child) => renderMarkdownBlock(child, next(level)))].filter(Boolean).join("\n\n");
    case "paragraph":
      return [heading(block.title, level), renderInlineMarkdown(block.text)].filter(Boolean).join("\n\n");
    case "summary":
    case "issue":
    case "quote":
      return [heading(block.title, level), renderInlineMarkdown(block.body ?? "")].filter(Boolean).join("\n\n");
    case "notice":
      return [heading(block.title, level), quoteText(block.text ?? block.body ?? "")].filter(Boolean).join("\n\n");
    case "decision":
      return [heading(block.title, level), `**Decision:** ${renderInlineMarkdown(block.decision)}`, block.rationale ? `**Rationale:** ${renderInlineMarkdown(block.rationale)}` : ""].filter(Boolean).join("\n\n");
    case "risk":
      return [heading(block.title, level), `**Risk:** ${renderInlineMarkdown(block.risk)}`, block.mitigation ? `**Mitigation:** ${renderInlineMarkdown(block.mitigation)}` : ""].filter(Boolean).join("\n\n");
    case "list":
      return [heading(block.title, level), block.items.map((item, index) => `${block.ordered ? `${index + 1}.` : "-"} ${renderInlineMarkdown(item)}`).join("\n")].filter(Boolean).join("\n\n");
    case "points":
    case "constraint":
    case "assumption":
      return [heading(block.title, level), asArray(block.items).map((item) => `- ${renderInlineMarkdown(item)}`).join("\n")].filter(Boolean).join("\n\n");
    case "table":
      return renderTable(block, level);
    case "cards":
      return [heading(block.title, level), block.items.map((item) => [heading(item.title, 3), item.body ?? item.text ? renderInlineMarkdown(item.body ?? item.text ?? "") : "", markdownLink("Open", item.href)].filter(Boolean).join("\n\n")).join("\n\n")].filter(Boolean).join("\n\n");
    case "compare":
      return [heading(block.title, level), (block.options ?? block.items ?? []).map((item) => Object.entries(item).map(([key, value]) => `- **${escapeInline(key)}:** ${escapeText(stringify(value))}`).join("\n")).join("\n\n")].filter(Boolean).join("\n\n");
    case "code":
      return [heading(block.title, level), fenced(block.language ?? "", block.code)].filter(Boolean).join("\n\n");
    case "command":
      return [heading(block.title, level), fenced(String(block.shell ?? "bash"), String(block.command ?? ""))].filter(Boolean).join("\n\n");
    case "output":
      return [heading(block.title, level), fenced("", String(block.body ?? ""))].filter(Boolean).join("\n\n");
    case "mermaid":
      return [heading(block.title, level), fenced("mermaid", block.diagram)].filter(Boolean).join("\n\n");
    case "keyValue":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => `- **${escapeInline(stringify(item.key))}:** ${renderInlineMarkdown(item.value)}`).join("\n")].filter(Boolean).join("\n\n");
    case "openQuestion":
      return [heading(block.title, level), `**Question:** ${renderInlineMarkdown(block.question ?? "")}`, block.context ? `**Context:** ${renderInlineMarkdown(block.context)}` : ""].filter(Boolean).join("\n\n");
    case "todo":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => `- ${renderInlineMarkdown(item.title)}${item.status ? ` (${escapeText(stringify(item.status))})` : ""}`).join("\n")].filter(Boolean).join("\n\n");
    case "checklist":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => `- [${item.checked ? "x" : " "}] ${renderInlineMarkdown(item.label)}`).join("\n")].filter(Boolean).join("\n\n");
    case "reference":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => {
        const link = markdownLink(stringify(item.label), stringify(item.path));
        return link ? `- ${link}` : `- ${escapeText(stringify(item.label))}`;
      }).join("\n")].filter(Boolean).join("\n\n");
    case "fileTree":
      return [heading(block.title, level), `**${escapeInline(String(block.root ?? ""))}**`, asArray(block.items).map((item) => objectRecord(item)).map((item) => `- ${inlineCode(stringify(item.path))}${item.description ? ` ${escapeText(stringify(item.description))}` : ""}`).join("\n")].filter(Boolean).join("\n\n");
    case "include":
      return "";
  }
}

function renderTable(block: TableBlock, level: number): string {
  const header = `| ${block.columns.map((column) => escapeTableCell(column.label)).join(" | ")} |`;
  const separator = `| ${block.columns.map(() => "---").join(" | ")} |`;
  const rows = block.rows.map((row) => {
    const record = Array.isArray(row) ? {} : row;
    return `| ${block.columns.map((column) => escapeTableCell(record[column.key] ?? "")).join(" | ")} |`;
  });
  return [heading(block.title, level), [header, separator, ...rows].join("\n")].filter(Boolean).join("\n\n");
}

function heading(title: string | undefined, level: number): string {
  if (!title) return "";
  return `${"#".repeat(Math.max(2, Math.min(6, level)))} ${escapeInline(title)}`;
}

function next(level: number): number {
  return Math.min(6, level + 1);
}

function fenced(language: string, content: string): string {
  const longestRun = Math.max(2, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(longestRun + 1);
  return `${fence}${language}\n${content}\n${fence}`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}\[\]()#+.!|<>])/g, "\\$1")
    .replace(/^(\s*)([-+])(\s+)/gm, "$1\\$2$3")
    .replace(/^(\s*)(\d+)\.(\s+)/gm, "$1$2\\.$3")
    .replace(/^(\s*)>(\s?)/gm, "$1\\>$2");
}

function escapeInline(value: string): string {
  return escapeText(value).replace(/\n/g, " ");
}

function escapeLinkLabel(value: string): string {
  return escapeInline(value).replace(/]/g, "\\]");
}

function markdownLink(label: string, hrefValue: string | undefined): string | undefined {
  const href = safeHref(hrefValue);
  if (!href) return undefined;
  return `[${escapeLinkLabel(label)}](${escapeLinkDestination(href)})`;
}

function escapeLinkDestination(value: string): string {
  return encodeURI(value)
    .replace(/%5B/gi, "[")
    .replace(/%5D/gi, "]")
    .replace(/[()]/g, (char) => (char === "(" ? "%28" : "%29"))
    .replace(/[\u0000-\u001F\u007F\s]/g, (char) => encodeURIComponent(char));
}

function escapeTableCell(value: unknown): string {
  return escapeTableCodePipes(renderInlineMarkdown(value)).replace(/ {2,}\r?\n/g, "<br>").replace(/\r?\n/g, "<br>");
}

function escapeTableCodePipes(value: string): string {
  return value.replace(/(`+)([\s\S]*?)\1/g, (_match: string, fence: string, content: string) => `${fence}${content.replace(/\|/g, "\\|")}${fence}`);
}

function quoteText(value: unknown): string {
  return renderInlineMarkdown(value)
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function inlineCode(value: string): string {
  const escaped = value.replace(/`/g, "\\`");
  return `\`${escaped}\``;
}
