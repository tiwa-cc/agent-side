import type { DocIR } from "../../ast/types.js";
import { escapeHtml as escape } from "../../utils/html.js";
import type { RenderContext } from "../types.js";
import { renderBlock } from "./renderBlock.js";

export function renderDocument(doc: DocIR, context: RenderContext): string {
  const lang = doc.lang ?? context.config.site.lang ?? "en";
  const outputMode = context.outputMode ?? context.config.renderer.output.mode;
  const mermaidScript = renderMermaidScript(context.config.renderer.mermaid.mode);
  const shellClass = shellClassForTheme(context);
  const styles = renderBootstrapCss(context);
  const rendererCss =
    outputMode === "single"
      ? `<style>
${styles}
  </style>`
      : `<link href="${escape(context.cssHref ?? "assets/agent-side.css")}" rel="stylesheet">`;

  return `<!doctype html>
<html lang="${escape(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(doc.title)}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  ${rendererCss}
</head>
<body>
  <main class="${shellClass}">
    <header class="mb-5">
      <h1>${escape(doc.title)}</h1>
      ${doc.description ? `<p class="lead">${escape(doc.description)}</p>` : ""}
    </header>
    ${doc.blocks.map((block) => renderBlock(block, { headingLevel: 2 })).join("\n")}
  </main>
  ${mermaidScript}
</body>
</html>
`;
}

function renderMermaidScript(mode: "cdn" | "bundled" | "pre_rendered"): string {
  if (mode === "bundled") {
    throw new Error('renderer.mermaid.mode "bundled" is configured but bundled Mermaid assets are not implemented yet');
  }
  if (mode === "pre_rendered") {
    throw new Error('renderer.mermaid.mode "pre_rendered" is configured but Mermaid pre-rendering is not implemented yet');
  }

  return `<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: false });
for (const [index, block] of document.querySelectorAll(".mermaid-block").entries()) {
  const source = block.querySelector(".mermaid-source");
  const output = block.querySelector(".mermaid-output");
  try {
    const { svg } = await mermaid.render(\`docir-mermaid-\${index}\`, source.textContent || "");
    output.innerHTML = svg;
    output.removeAttribute("aria-hidden");
    source.hidden = true;
  } catch (error) {
    const message = document.createElement("p");
    message.className = "alert alert-warning mt-2";
    message.textContent = "Mermaid rendering failed. The diagram source is shown above.";
    block.append(message);
  }
}
</script>`
}

export function renderBootstrapCss(context: RenderContext): string {
  const tokens = context.theme?.tokens ?? {};
  const surface = cssColor(tokens.surface, "#ffffff");
  const text = cssColor(tokens.text, "#212529");
  const accent = cssColor(tokens.accent, "#0d6efd");
  const sectionSpacing = context.theme?.blocks.section?.spacing ?? "normal";
  const sectionMargin = sectionSpacing === "compact" ? "1rem" : sectionSpacing === "loose" ? "3rem" : "2rem";

  return `    :root { --docir-accent: ${accent}; --docir-surface: ${surface}; --docir-text: ${text}; }
    body { background: #f8f9fa; color: var(--docir-text); }
    .doc-shell { margin: 0 auto; padding: 48px 20px 72px; background: var(--docir-surface); min-height: 100vh; }
    .doc-shell-sm { max-width: 720px; }
    .doc-shell-md { max-width: 840px; }
    .doc-shell-lg { max-width: 960px; }
    .doc-shell-xl { max-width: 1140px; }
    .doc-shell-fluid { max-width: none; }
    .doc-section { margin-top: ${sectionMargin}; }
    .doc-wide { max-width: 1120px; }
    .doc-full { max-width: none; }
    h1, h2, h3 { letter-spacing: 0; }
    a { color: var(--docir-accent); }
    pre { padding: 1rem; background: #212529; color: #f8f9fa; border-radius: .375rem; overflow-x: auto; }
    .mermaid-source { background: #fff; color: #212529; border: 1px solid #dee2e6; }
    .mermaid-output svg { max-width: 100%; height: auto; }`;
}

function shellClassForTheme(context: RenderContext): string {
  const container = context.theme?.blocks.page?.container ?? "lg";
  return `doc-shell doc-shell-${container}`;
}

function cssColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^[a-zA-Z]+$/.test(value)) return value;
  return fallback;
}
