import type { DocIR } from "../../ast/types.js";
import { escapeHtml as escape } from "../../utils/html.js";
import type { RenderContext } from "../types.js";
import { renderBlock } from "./renderBlock.js";

export function renderDocument(doc: DocIR, context: RenderContext): string {
  const mermaidScript =
    context.config.renderer.mermaid.mode === "cdn"
      ? '<script type="module">import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs"; mermaid.initialize({ startOnLoad: true });</script>'
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(doc.title)}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: #f8f9fa; }
    .doc-shell { max-width: 960px; margin: 0 auto; padding: 48px 20px 72px; background: #fff; min-height: 100vh; }
    .doc-section { margin-top: 2rem; }
    .doc-wide { max-width: 1120px; }
    .doc-full { max-width: none; }
    h1, h2, h3 { letter-spacing: 0; }
    pre { padding: 1rem; background: #212529; color: #f8f9fa; border-radius: .375rem; overflow-x: auto; }
    .mermaid { background: #fff; color: #212529; border: 1px solid #dee2e6; }
  </style>
</head>
<body>
  <main class="doc-shell">
    <header class="mb-5">
      <h1>${escape(doc.title)}</h1>
      ${doc.description ? `<p class="lead">${escape(doc.description)}</p>` : ""}
    </header>
    ${doc.blocks.map(renderBlock).join("\n")}
  </main>
  ${mermaidScript}
</body>
</html>
`;
}
