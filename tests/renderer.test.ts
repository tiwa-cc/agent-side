import { describe, expect, it } from "vitest";
import type { DocIR } from "../src/ast/types.js";
import type { DocirConfig } from "../src/config/configSchema.js";
import { renderDocument } from "../src/renderer/bootstrap/renderDocument.js";

const config: DocirConfig = {
  site: {
    title: "Test",
    lang: "ja",
    entry: "docs/index.yml",
    out_dir: "dist",
  },
  renderer: {
    name: "bootstrap",
    theme: "default",
    mermaid: {
      mode: "cdn",
    },
  },
  include: {
    base_dir: "docs",
    allow_parent: false,
  },
  validation: {
    strict: true,
    unknown_keys: "error",
  },
  theme: {
    path: "themes/default.yml",
  },
};

describe("bootstrap renderer", () => {
  it("renders stable semantic HTML for representative blocks", () => {
    const doc: DocIR = {
      title: "Renderer Snapshot",
      description: "Snapshot target",
      blocks: [
        {
          type: "notice",
          title: "Notice",
          tone: "info",
          text: "Read this.",
        },
        {
          type: "section",
          title: "Section",
          blocks: [
            {
              type: "mermaid",
              title: "Flow",
              diagram: "flowchart TD\n  A --> B",
            },
            {
              type: "decision",
              title: "Decision",
              decision: "Use DocIR.",
              rationale: "It is structured.",
            },
            {
              type: "table",
              title: "Table",
              columns: [
                { key: "name", label: "Name" },
                { key: "value", label: "Value" },
              ],
              rows: [{ name: "Renderer", value: "Bootstrap" }],
            },
            {
              type: "cards",
              title: "Cards",
              items: [{ title: "Card", text: "Grouped item." }],
            },
            {
              type: "risk",
              title: "Risk",
              risk: "Presentation leakage.",
              mitigation: "Validate keys.",
            },
          ],
        },
      ],
    };

    const html = renderDocument(doc, { config });

    expect(html).toContain('<html lang="ja">');
    expect(html).toContain('<section class="doc-section">');
    expect(html).not.toContain('class=""');
    expect(html).not.toMatch(/class="[^"]*doc-section\s/);
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<h3>Flow</h3>");
    expect(html).toContain('<pre class="mermaid-source">');
    expect(html).toContain("Mermaid rendering failed. The diagram source is shown above.");
    expect(html).toMatchSnapshot();
  });

  it("lets page language override site language", () => {
    const doc: DocIR = {
      title: "Language",
      lang: "en",
      blocks: [],
    };

    expect(renderDocument(doc, { config })).toContain('<html lang="en">');
  });
});
