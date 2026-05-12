import type { Block, DocIR, TableBlock } from "../../ast/types.js";
import { asArray, objectRecord, safeHref, stringify } from "../shared.js";

export function renderMarkdownDocument(doc: DocIR): string {
  return [`# ${escapeMarkdown(doc.title)}`, doc.description ? escapeMarkdown(doc.description) : "", ...doc.blocks.map((block) => renderMarkdownBlock(block, 2))]
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
      return [heading(block.title, level), escapeMarkdown(block.text)].filter(Boolean).join("\n\n");
    case "summary":
    case "issue":
    case "quote":
      return [heading(block.title, level), escapeMarkdown(String(block.body ?? ""))].filter(Boolean).join("\n\n");
    case "notice":
      return [heading(block.title, level), `> ${escapeMarkdown(block.text ?? block.body ?? "")}`].filter(Boolean).join("\n\n");
    case "decision":
      return [heading(block.title, level), `**Decision:** ${escapeMarkdown(block.decision)}`, block.rationale ? `**Rationale:** ${escapeMarkdown(block.rationale)}` : ""].filter(Boolean).join("\n\n");
    case "risk":
      return [heading(block.title, level), `**Risk:** ${escapeMarkdown(block.risk)}`, block.mitigation ? `**Mitigation:** ${escapeMarkdown(block.mitigation)}` : ""].filter(Boolean).join("\n\n");
    case "list":
      return [heading(block.title, level), block.items.map((item, index) => `${block.ordered ? `${index + 1}.` : "-"} ${escapeMarkdown(item)}`).join("\n")].filter(Boolean).join("\n\n");
    case "points":
    case "constraint":
    case "assumption":
      return [heading(block.title, level), asArray(block.items).map((item) => `- ${escapeMarkdown(stringify(item))}`).join("\n")].filter(Boolean).join("\n\n");
    case "table":
      return renderTable(block, level);
    case "cards":
      return [heading(block.title, level), block.items.map((item) => [`### ${escapeMarkdown(item.title)}`, item.body ?? item.text ? escapeMarkdown(item.body ?? item.text ?? "") : "", safeHref(item.href) ? `[Open](${safeHref(item.href)})` : ""].filter(Boolean).join("\n\n")).join("\n\n")].filter(Boolean).join("\n\n");
    case "compare":
      return [heading(block.title, level), (block.options ?? block.items ?? []).map((item) => Object.entries(item).map(([key, value]) => `- **${escapeMarkdown(key)}:** ${escapeMarkdown(stringify(value))}`).join("\n")).join("\n\n")].filter(Boolean).join("\n\n");
    case "code":
      return [heading(block.title, level), fenced(block.language ?? "", block.code)].filter(Boolean).join("\n\n");
    case "command":
      return [heading(block.title, level), fenced(String(block.shell ?? "bash"), String(block.command ?? ""))].filter(Boolean).join("\n\n");
    case "output":
      return [heading(block.title, level), fenced("", String(block.body ?? ""))].filter(Boolean).join("\n\n");
    case "mermaid":
      return [heading(block.title, level), fenced("mermaid", block.diagram)].filter(Boolean).join("\n\n");
    case "keyValue":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => `- **${escapeMarkdown(stringify(item.key))}:** ${escapeMarkdown(stringify(item.value))}`).join("\n")].filter(Boolean).join("\n\n");
    case "openQuestion":
      return [heading(block.title, level), `**Question:** ${escapeMarkdown(String(block.question ?? ""))}`, block.context ? `**Context:** ${escapeMarkdown(String(block.context))}` : ""].filter(Boolean).join("\n\n");
    case "todo":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => `- ${escapeMarkdown(stringify(item.title))}${item.status ? ` (${escapeMarkdown(stringify(item.status))})` : ""}`).join("\n")].filter(Boolean).join("\n\n");
    case "checklist":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => `- [${item.checked ? "x" : " "}] ${escapeMarkdown(stringify(item.label))}`).join("\n")].filter(Boolean).join("\n\n");
    case "reference":
      return [heading(block.title, level), asArray(block.items).map((item) => objectRecord(item)).map((item) => {
        const href = safeHref(stringify(item.path));
        return href ? `- [${escapeMarkdown(stringify(item.label))}](${href})` : `- ${escapeMarkdown(stringify(item.label))}`;
      }).join("\n")].filter(Boolean).join("\n\n");
    case "fileTree":
      return [heading(block.title, level), `**${escapeMarkdown(String(block.root ?? ""))}**`, asArray(block.items).map((item) => objectRecord(item)).map((item) => `- \`${stringify(item.path)}\`${item.description ? ` ${escapeMarkdown(stringify(item.description))}` : ""}`).join("\n")].filter(Boolean).join("\n\n");
    case "include":
      return "";
  }
}

function renderTable(block: TableBlock, level: number): string {
  const header = `| ${block.columns.map((column) => escapeMarkdown(column.label)).join(" | ")} |`;
  const separator = `| ${block.columns.map(() => "---").join(" | ")} |`;
  const rows = block.rows.map((row) => {
    const record = Array.isArray(row) ? {} : row;
    return `| ${block.columns.map((column) => escapeMarkdown(String(record[column.key] ?? ""))).join(" | ")} |`;
  });
  return [heading(block.title, level), [header, separator, ...rows].join("\n")].filter(Boolean).join("\n\n");
}

function heading(title: string | undefined, level: number): string {
  if (!title) return "";
  return `${"#".repeat(Math.max(2, Math.min(6, level)))} ${escapeMarkdown(title)}`;
}

function next(level: number): number {
  return Math.min(6, level + 1);
}

function fenced(language: string, content: string): string {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|");
}
