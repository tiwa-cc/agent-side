import type { Block, TableBlock } from "../../ast/types.js";
import { escapeHtml as escape } from "../../utils/html.js";

const toneClass = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  danger: "alert-danger",
  neutral: "alert-secondary",
};

export function renderBlock(block: Block): string {
  switch (block.type) {
    case "section":
      return `<section class="doc-section ${widthClass(block.width)}">${block.title ? `<h2>${escape(block.title)}</h2>` : ""}${block.blocks.map(renderBlock).join("\n")}</section>`;
    case "paragraph":
      return block.title
        ? `<section class="${widthClass(block.width)}"><h2>${escape(block.title)}</h2><p>${escape(block.text)}</p></section>`
        : `<p class="${widthClass(block.width)}">${escape(block.text)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `${block.title ? `<h2>${escape(block.title)}</h2>` : ""}<${tag}>${block.items.map((item) => `<li>${escape(item)}</li>`).join("")}</${tag}>`;
    }
    case "notice":
      return `<div class="alert ${toneClass[block.tone ?? "info"]}" role="note">${block.title ? `<h2 class="h5">${escape(block.title)}</h2>` : ""}<p>${escape(block.text)}</p></div>`;
    case "decision":
      return `<article class="border-start border-success border-4 ps-3 my-4">${block.title ? `<h2 class="h5">${escape(block.title)}</h2>` : ""}<p><strong>Decision:</strong> ${escape(block.decision)}</p>${block.rationale ? `<p><strong>Rationale:</strong> ${escape(block.rationale)}</p>` : ""}</article>`;
    case "risk":
      return `<article class="border-start border-warning border-4 ps-3 my-4">${block.title ? `<h2 class="h5">${escape(block.title)}</h2>` : ""}<p><strong>Risk:</strong> ${escape(block.risk)}</p>${block.mitigation ? `<p><strong>Mitigation:</strong> ${escape(block.mitigation)}</p>` : ""}</article>`;
    case "compare":
      return `<section>${block.title ? `<h2>${escape(block.title)}</h2>` : ""}<div class="row g-3">${block.options
        .map(
          (option) =>
            `<div class="col-md"><div class="card h-100"><div class="card-body">${Object.entries(option)
              .map(([key, value]) => `<p><strong>${escape(labelize(key))}:</strong> ${escape(value)}</p>`)
              .join("")}</div></div></div>`,
        )
        .join("")}</div></section>`;
    case "cards":
      return `<section>${block.title ? `<h2>${escape(block.title)}</h2>` : ""}<div class="row g-3">${block.items
        .map(
          (item) =>
            `<div class="col-md-4"><article class="card h-100"><div class="card-body"><h3 class="h5">${escape(item.title)}</h3>${item.text ? `<p>${escape(item.text)}</p>` : ""}${item.href ? `<a href="${escape(item.href)}">Open</a>` : ""}</div></article></div>`,
        )
        .join("")}</div></section>`;
    case "table":
      return renderTable(block);
    case "code":
      return `${block.title ? `<h2>${escape(block.title)}</h2>` : ""}<pre><code class="language-${escape(block.language ?? "text")}">${escape(block.code)}</code></pre>`;
    case "mermaid":
      return `${block.title ? `<h2>${escape(block.title)}</h2>` : ""}<pre class="mermaid">${escape(block.diagram)}</pre>`;
    case "include":
      return "";
  }
}

function renderTable(block: TableBlock): string {
  return `<section>${block.title ? `<h2>${escape(block.title)}</h2>` : ""}<div class="table-responsive"><table class="table table-striped align-middle"><thead><tr>${block.columns
    .map((column) => `<th scope="col">${escape(column.label)}</th>`)
    .join("")}</tr></thead><tbody>${block.rows
    .map((row) => `<tr>${block.columns.map((column) => `<td>${escape(String(row[column.key] ?? ""))}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div></section>`;
}

function widthClass(width: string | undefined): string {
  if (width === "wide") return "doc-wide";
  if (width === "full") return "doc-full";
  return "";
}

function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
