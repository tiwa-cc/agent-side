import type { Block, TableBlock } from "../../ast/types.js";
import { classNames, escapeHtml as escape } from "../../utils/html.js";
import { asArray, labelize, objectRecord, safeHref, stringify } from "../shared.js";

interface BlockRenderState {
  headingLevel: number;
}

const toneClass = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  danger: "alert-danger",
  neutral: "alert-secondary",
  caution: "alert-warning",
};

export function renderBlock(block: Block, state: BlockRenderState): string {
  switch (block.type) {
    case "section":
      return `<section class="${classNames("doc-section", widthClass(block.width))}">${renderTitle(block.title, state.headingLevel)}${block.blocks.map((child) => renderBlock(child, { headingLevel: nextHeadingLevel(state.headingLevel) })).join("\n")}</section>`;
    case "paragraph":
      return block.title
        ? `<section${classAttr(widthClass(block.width))}>${renderTitle(block.title, state.headingLevel)}<p>${escape(block.text)}</p></section>`
        : `<p${classAttr(widthClass(block.width))}>${escape(block.text)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `${renderTitle(block.title, state.headingLevel)}<${tag}>${block.items.map((item) => `<li>${escape(item)}</li>`).join("")}</${tag}>`;
    }
    case "notice":
      return `<div class="${classNames("alert", toneClass[block.tone ?? "info"])}" role="note">${renderTitle(block.title, state.headingLevel, "h5")}<p>${escape(block.text ?? block.body ?? "")}</p></div>`;
    case "decision":
      return `<article class="border-start border-success border-4 ps-3 my-4">${renderTitle(block.title, state.headingLevel, "h5")}<p><strong>Decision:</strong> ${escape(block.decision)}</p>${block.rationale ? `<p><strong>Rationale:</strong> ${escape(block.rationale)}</p>` : ""}</article>`;
    case "risk":
      return `<article class="border-start border-warning border-4 ps-3 my-4">${renderTitle(block.title, state.headingLevel, "h5")}<p><strong>Risk:</strong> ${escape(block.risk)}</p>${block.mitigation ? `<p><strong>Mitigation:</strong> ${escape(block.mitigation)}</p>` : ""}</article>`;
    case "compare":
      return `<section>${renderTitle(block.title, state.headingLevel)}<div class="row g-3">${(block.options ?? block.items ?? [])
        .map(
          (option) =>
            `<div class="col-md"><div class="card h-100"><div class="card-body">${Object.entries(option)
              .map(([key, value]) => `<p><strong>${escape(labelize(key))}:</strong> ${escape(stringify(value))}</p>`)
              .join("")}</div></div></div>`,
        )
        .join("")}</div></section>`;
    case "cards":
      return `<section>${renderTitle(block.title, state.headingLevel)}<div class="row g-3">${block.items
        .map(
          (item) =>
            `<div class="col-md-4"><article class="card h-100"><div class="card-body">${renderTitle(item.title, nextHeadingLevel(state.headingLevel), "h5")}${item.badge ? `<p><span class="badge text-bg-secondary">${escape(item.badge)}</span></p>` : ""}${item.text ?? item.body ? `<p>${escape(item.text ?? item.body ?? "")}</p>` : ""}${safeHref(item.href) ? `<a href="${escape(safeHref(item.href) ?? "")}">Open</a>` : ""}</div></article></div>`,
        )
        .join("")}</div></section>`;
    case "table":
      return renderTable(block, state);
    case "code":
      return `${renderTitle(block.title, state.headingLevel)}<pre><code class="language-${escape(block.language ?? "text")}">${escape(block.code)}</code></pre>`;
    case "mermaid":
      return `${renderTitle(block.title, state.headingLevel)}<div class="mermaid-block"><pre class="mermaid-source">${escape(block.diagram)}</pre><div class="mermaid-output" aria-hidden="true"></div></div>`;
    case "include":
      return "";
    case "summary":
      return `<section>${renderTitle(block.title, state.headingLevel)}<p>${escape(String(block.body ?? ""))}</p></section>`;
    case "points":
    case "constraint":
    case "assumption":
      return `${renderTitle(block.title, state.headingLevel)}<ul>${asArray(block.items).map((item) => `<li>${escape(stringify(item))}</li>`).join("")}</ul>`;
    case "keyValue":
      return `<section>${renderTitle(block.title, state.headingLevel)}<dl>${asArray(block.items)
        .map((item) => objectRecord(item))
        .map((item) => `<dt>${escape(stringify(item.key))}</dt><dd>${escape(stringify(item.value))}</dd>`)
        .join("")}</dl></section>`;
    case "openQuestion":
      return `<article class="border-start border-info border-4 ps-3 my-4">${renderTitle(block.title, state.headingLevel, "h5")}<p><strong>Question:</strong> ${escape(String(block.question ?? ""))}</p>${block.context ? `<p><strong>Context:</strong> ${escape(String(block.context))}</p>` : ""}</article>`;
    case "command":
      return `${renderTitle(block.title, state.headingLevel)}<pre><code class="language-${escape(String(block.shell ?? "bash"))}">${escape(String(block.command ?? ""))}</code></pre>`;
    case "output":
      return `${renderTitle(block.title, state.headingLevel)}<pre><code>${escape(String(block.body ?? ""))}</code></pre>`;
    case "todo":
      return `<section>${renderTitle(block.title, state.headingLevel)}<ul>${asArray(block.items)
        .map((item) => objectRecord(item))
        .map((item) => `<li><strong>${escape(stringify(item.title))}</strong>${item.status ? ` <span class="badge text-bg-secondary">${escape(stringify(item.status))}</span>` : ""}</li>`)
        .join("")}</ul></section>`;
    case "issue":
      return `<article class="border-start border-danger border-4 ps-3 my-4">${renderTitle(block.title, state.headingLevel, "h5")}<p>${escape(String(block.body ?? ""))}</p></article>`;
    case "checklist":
      return `<section>${renderTitle(block.title, state.headingLevel)}<ul class="list-unstyled">${asArray(block.items)
        .map((item) => objectRecord(item))
        .map((item) => `<li><input class="form-check-input me-2" type="checkbox" disabled${item.checked ? " checked" : ""}>${escape(stringify(item.label))}</li>`)
        .join("")}</ul></section>`;
    case "quote":
      return `<figure>${renderTitle(block.title, state.headingLevel)}<blockquote class="blockquote"><p>${escape(String(block.body ?? ""))}</p></blockquote></figure>`;
    case "reference":
      return `<section>${renderTitle(block.title, state.headingLevel)}<ul>${asArray(block.items)
        .map((item) => objectRecord(item))
        .map((item) => {
          const href = safeHref(stringify(item.path));
          return `<li>${href ? `<a href="${escape(href)}">${escape(stringify(item.label))}</a>` : escape(stringify(item.label))}</li>`;
        })
        .join("")}</ul></section>`;
    case "fileTree":
      return `<section>${renderTitle(block.title, state.headingLevel)}<p><strong>${escape(String(block.root ?? ""))}</strong></p><ul>${asArray(block.items)
        .map((item) => objectRecord(item))
        .map((item) => `<li><code>${escape(stringify(item.path))}</code>${item.description ? ` ${escape(stringify(item.description))}` : ""}</li>`)
        .join("")}</ul></section>`;
  }
}

function renderTable(block: TableBlock, state: BlockRenderState): string {
  return `<section>${renderTitle(block.title, state.headingLevel)}<div class="table-responsive"><table class="table table-striped align-middle"><thead><tr>${block.columns
    .map((column) => `<th scope="col">${escape(column.label)}</th>`)
    .join("")}</tr></thead><tbody>${block.rows
    .map((row) => {
      const record = Array.isArray(row) ? {} : row;
      return `<tr>${block.columns.map((column) => `<td>${escape(String(record[column.key] ?? ""))}</td>`).join("")}</tr>`;
    })
    .join("")}</tbody></table></div></section>`;
}

function widthClass(width: string | undefined): string {
  if (width === "wide") return "doc-wide";
  if (width === "full") return "doc-full";
  return "";
}

function classAttr(value: string | undefined): string {
  const classes = classNames(value);
  return classes ? ` class="${classes}"` : "";
}

function renderTitle(title: string | undefined, level: number, visualClass?: string): string {
  if (!title) return "";
  const tag = `h${Math.max(2, Math.min(6, level))}`;
  return `<${tag}${classAttr(visualClass)}>${escape(title)}</${tag}>`;
}

function nextHeadingLevel(level: number): number {
  return Math.min(6, level + 1);
}
