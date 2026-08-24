import type { InlineNode } from "../ast/types.js";
import { safeHref } from "./shared.js";
import { escapeHtml } from "../utils/html.js";

export function renderInlineHtml(value: unknown): string {
  if (Array.isArray(value)) return value.map(renderInlineHtmlNode).join("");
  if (value === undefined || value === null) return "";
  return escapeHtml(String(value));
}

export function renderInlineMarkdown(value: unknown): string {
  if (Array.isArray(value)) return value.map(renderInlineMarkdownNode).join("");
  if (value === undefined || value === null) return "";
  return escapeMarkdownText(String(value));
}

export function inlineText(value: unknown): string {
  if (Array.isArray(value)) return value.map(inlineTextNode).join("");
  if (value === undefined || value === null) return "";
  return String(value);
}

function renderInlineHtmlNode(value: unknown): string {
  const node = record(value);
  if (!node || typeof node.type !== "string") return escapeHtml(inlineText(value));

  switch (node.type) {
    case "text":
      return escapeHtml(String(node.text ?? ""));
    case "strong":
      return `<strong>${renderInlineHtml(node.children)}</strong>`;
    case "em":
      return `<em>${renderInlineHtml(node.children)}</em>`;
    case "del":
      return `<del>${renderInlineHtml(node.children)}</del>`;
    case "inlineCode":
      return `<code>${escapeHtml(String(node.text ?? ""))}</code>`;
    case "link": {
      const href = safeHref(typeof node.href === "string" ? node.href : undefined);
      if (!href) return renderInlineHtml(node.children);
      const title = typeof node.title === "string" ? ` title="${escapeHtml(node.title)}"` : "";
      return `<a href="${escapeHtml(href)}"${title}>${renderInlineHtml(node.children)}</a>`;
    }
    case "break":
      return "<br>";
    case "image": {
      const src = safeHref(typeof node.src === "string" ? node.src : undefined);
      if (!src) return escapeHtml(String(node.alt ?? ""));
      const alt = escapeHtml(String(node.alt ?? ""));
      const title = typeof node.title === "string" ? ` title="${escapeHtml(node.title)}"` : "";
      return `<img src="${escapeHtml(src)}" alt="${alt}"${title}>`;
    }
    default:
      return escapeHtml(inlineText(node));
  }
}

function renderInlineMarkdownNode(value: unknown): string {
  const node = record(value);
  if (!node || typeof node.type !== "string") return escapeMarkdownText(inlineText(value));

  switch (node.type) {
    case "text":
      return escapeMarkdownText(String(node.text ?? ""));
    case "strong":
      return `**${renderInlineMarkdown(node.children)}**`;
    case "em":
      return `*${renderInlineMarkdown(node.children)}*`;
    case "del":
      return `~~${renderInlineMarkdown(node.children)}~~`;
    case "inlineCode":
      return inlineCode(String(node.text ?? ""));
    case "link": {
      const href = safeHref(typeof node.href === "string" ? node.href : undefined);
      if (!href) return renderInlineMarkdown(node.children);
      return `[${renderInlineMarkdown(node.children)}](${escapeLinkDestination(href)})`;
    }
    case "break":
      return "  \n";
    case "image": {
      const src = safeHref(typeof node.src === "string" ? node.src : undefined);
      if (!src) return escapeMarkdownText(String(node.alt ?? ""));
      return `![${escapeInline(String(node.alt ?? ""))}](${escapeLinkDestination(src)})`;
    }
    default:
      return escapeMarkdownText(inlineText(node));
  }
}

function inlineTextNode(value: unknown): string {
  const node = record(value);
  if (!node || typeof node.type !== "string") return String(value ?? "");

  switch (node.type) {
    case "text":
    case "inlineCode":
      return String(node.text ?? "");
    case "strong":
    case "em":
    case "del":
    case "link":
      return inlineText(node.children);
    case "break":
      return "\n";
    case "image":
      return String(node.alt ?? "");
    default:
      return "";
  }
}

function escapeMarkdownText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}\[\]()#+.!|<>])/g, "\\$1")
    .replace(/^(\s*)([-+])(\s+)/gm, "$1\\$2$3")
    .replace(/^(\s*)(\d+)\.(\s+)/gm, "$1$2\\.$3")
    .replace(/^(\s*)>(\s?)/gm, "$1\\>$2");
}

function escapeInline(value: string): string {
  return escapeMarkdownText(value).replace(/\n/g, " ");
}

function inlineCode(value: string): string {
  const longestRun = Math.max(1, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(longestRun + 1);
  return value.includes("`") ? `${fence} ${value} ${fence}` : `${fence}${value}${fence}`;
}

function escapeLinkDestination(value: string): string {
  return encodeURI(value)
    .replace(/%5B/gi, "[")
    .replace(/%5D/gi, "]")
    .replace(/[()]/g, (char) => (char === "(" ? "%28" : "%29"))
    .replace(/[\u0000-\u001F\u007F\s]/g, (char) => encodeURIComponent(char));
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
