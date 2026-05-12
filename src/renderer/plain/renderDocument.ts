import type { Block, DocIR, TableBlock } from "../../ast/types.js";
import { escapeHtml as escape } from "../../utils/html.js";
import type { RenderContext } from "../types.js";
import { asArray, labelize, objectRecord, safeHref, stringify } from "../shared.js";

export function renderPlainDocument(doc: DocIR, context: RenderContext): string {
  const lang = doc.lang ?? context.config.site.lang ?? "en";
  const css =
    context.outputMode === "single"
      ? `<style>
${renderPlainCss()}
  </style>`
      : `<link href="${escape(context.cssHref ?? "assets/agent-side.css")}" rel="stylesheet">`;

  return `<!doctype html>
<html lang="${escape(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(doc.title)}</title>
  ${css}
</head>
<body>
  <main class="doc">
    <header>
      <h1>${escape(doc.title)}</h1>
      ${doc.description ? `<p class="lead">${escape(doc.description)}</p>` : ""}
    </header>
    ${doc.blocks.map((block) => renderPlainBlock(block, 2)).join("\n")}
  </main>
</body>
</html>
`;
}

export function renderPlainCss(): string {
  return `    :root { color-scheme: light; }
    body { margin: 0; background: #f6f7f9; color: #1f2328; font: 16px/1.6 system-ui, sans-serif; }
    .doc { max-width: 960px; margin: 0 auto; padding: 48px 20px 72px; background: #fff; min-height: 100vh; }
    section { margin-top: 2rem; }
    article, .notice { border-left: 4px solid #8c959f; padding-left: 1rem; margin: 1.5rem 0; }
    pre { padding: 1rem; background: #f6f8fa; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d0d7de; padding: .5rem; text-align: left; vertical-align: top; }`;
}

function renderPlainBlock(block: Block, level: number): string {
  switch (block.type) {
    case "section":
      return `<section>${heading(block.title, level)}${block.blocks.map((child) => renderPlainBlock(child, next(level))).join("\n")}</section>`;
    case "paragraph":
      return `${heading(block.title, level)}<p>${escape(block.text)}</p>`;
    case "list":
      return `${heading(block.title, level)}<${block.ordered ? "ol" : "ul"}>${block.items.map((item) => `<li>${escape(item)}</li>`).join("")}</${block.ordered ? "ol" : "ul"}>`;
    case "notice":
      return `<aside class="notice">${heading(block.title, level)}<p>${escape(block.text ?? block.body ?? "")}</p></aside>`;
    case "decision":
      return `<article>${heading(block.title, level)}<p><strong>Decision:</strong> ${escape(block.decision)}</p>${block.rationale ? `<p><strong>Rationale:</strong> ${escape(block.rationale)}</p>` : ""}</article>`;
    case "risk":
      return `<article>${heading(block.title, level)}<p><strong>Risk:</strong> ${escape(block.risk)}</p>${block.mitigation ? `<p><strong>Mitigation:</strong> ${escape(block.mitigation)}</p>` : ""}</article>`;
    case "table":
      return renderTable(block, level);
    case "cards":
      return `<section>${heading(block.title, level)}${block.items.map((item) => `<article>${heading(item.title, next(level))}${item.body ?? item.text ? `<p>${escape(item.body ?? item.text ?? "")}</p>` : ""}${safeHref(item.href) ? `<p><a href="${escape(safeHref(item.href) ?? "")}">Open</a></p>` : ""}</article>`).join("")}</section>`;
    case "compare":
      return `<section>${heading(block.title, level)}${(block.options ?? block.items ?? []).map((item) => `<article>${Object.entries(item).map(([key, value]) => `<p><strong>${escape(labelize(key))}:</strong> ${escape(stringify(value))}</p>`).join("")}</article>`).join("")}</section>`;
    case "code":
    case "command":
      return `${heading(block.title, level)}<pre><code>${escape(String(block.type === "code" ? block.code : block.command ?? ""))}</code></pre>`;
    case "output":
      return `${heading(block.title, level)}<pre><code>${escape(String(block.body ?? ""))}</code></pre>`;
    case "mermaid":
      return `${heading(block.title, level)}<pre><code>${escape(block.diagram)}</code></pre>`;
    case "summary":
    case "issue":
    case "quote":
      return `${heading(block.title, level)}<p>${escape(String(block.body ?? ""))}</p>`;
    case "points":
    case "constraint":
    case "assumption":
      return `${heading(block.title, level)}<ul>${asArray(block.items).map((item) => `<li>${escape(stringify(item))}</li>`).join("")}</ul>`;
    case "keyValue":
      return `${heading(block.title, level)}<dl>${asArray(block.items).map((item) => objectRecord(item)).map((item) => `<dt>${escape(stringify(item.key))}</dt><dd>${escape(stringify(item.value))}</dd>`).join("")}</dl>`;
    case "openQuestion":
      return `<article>${heading(block.title, level)}<p><strong>Question:</strong> ${escape(String(block.question ?? ""))}</p>${block.context ? `<p><strong>Context:</strong> ${escape(String(block.context))}</p>` : ""}</article>`;
    case "todo":
      return `${heading(block.title, level)}<ul>${asArray(block.items).map((item) => objectRecord(item)).map((item) => `<li>${escape(stringify(item.title))}${item.status ? ` (${escape(stringify(item.status))})` : ""}</li>`).join("")}</ul>`;
    case "checklist":
      return `${heading(block.title, level)}<ul>${asArray(block.items).map((item) => objectRecord(item)).map((item) => `<li>${item.checked ? "[x]" : "[ ]"} ${escape(stringify(item.label))}</li>`).join("")}</ul>`;
    case "reference":
      return `${heading(block.title, level)}<ul>${asArray(block.items).map((item) => objectRecord(item)).map((item) => {
        const href = safeHref(stringify(item.path));
        return `<li>${href ? `<a href="${escape(href)}">${escape(stringify(item.label))}</a>` : escape(stringify(item.label))}</li>`;
      }).join("")}</ul>`;
    case "fileTree":
      return `${heading(block.title, level)}<p><strong>${escape(String(block.root ?? ""))}</strong></p><ul>${asArray(block.items).map((item) => objectRecord(item)).map((item) => `<li><code>${escape(stringify(item.path))}</code>${item.description ? ` ${escape(stringify(item.description))}` : ""}</li>`).join("")}</ul>`;
    case "include":
      return "";
  }
}

function renderTable(block: TableBlock, level: number): string {
  return `<section>${heading(block.title, level)}<table><thead><tr>${block.columns.map((column) => `<th>${escape(column.label)}</th>`).join("")}</tr></thead><tbody>${block.rows
    .map((row) => {
      const record = Array.isArray(row) ? {} : row;
      return `<tr>${block.columns.map((column) => `<td>${escape(String(record[column.key] ?? ""))}</td>`).join("")}</tr>`;
    })
    .join("")}</tbody></table></section>`;
}

function heading(title: string | undefined, level: number): string {
  if (!title) return "";
  const tag = `h${Math.max(2, Math.min(6, level))}`;
  return `<${tag}>${escape(title)}</${tag}>`;
}

function next(level: number): number {
  return Math.min(6, level + 1);
}
