import { describe, expect, it } from "vitest";
import { resolve } from "pathe";
import type { DocIR, Block } from "../src/ast/types.js";
import type { DocirConfig } from "../src/config/configSchema.js";
import { loadProject } from "../src/core/loadProject.js";
import { renderProject } from "../src/core/renderProject.js";
import { validateDoc } from "../src/core/validateDoc.js";
import { parseOutputMode } from "../src/cli/outputMode.js";
import { renderBlock } from "../src/renderer/bootstrap/renderBlock.js";
import { renderDocument } from "../src/renderer/bootstrap/renderDocument.js";
import { renderMarkdownDocument } from "../src/renderer/markdown/renderDocument.js";
import { renderPlainDocument } from "../src/renderer/plain/renderDocument.js";

const repoRoot = process.cwd();
const fixturesRoot = resolve(repoRoot, "tests/fixtures");

describe("fixture-based rendering", () => {
  it("loads, validates, normalizes, and renders the minimal fixture", async () => {
    const { html } = await renderFixture("minimal");

    expect(html).toContain("<h1>Minimal</h1>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<main class="doc-shell doc-shell-lg">');
    expect(html).toMatchSnapshot();
  });

  it("loads, validates, normalizes, resolves includes, and renders the complex fixture", async () => {
    const { html } = await renderFixture("complex");

    expect(html).toContain("Included Section");
    expect(html).toContain("<h2>Project Overview</h2>");
    expect(html).toContain("<h3>Summary</h3>");
    expect(html).toContain('<pre class="mermaid-source">');
    expect(html).not.toContain('class=""');
    expect(html).not.toMatch(/class="[^"]*\s+"/);
    expect(html).toMatchSnapshot();
  });

  it("honors validation unknown_keys strip mode", async () => {
    const { doc } = await loadFixture("unknown-key-strip");
    const firstBlock = doc.blocks[0] as Record<string, unknown>;
    const secondBlock = doc.blocks[1] as { items: Array<Record<string, unknown>> };
    const thirdBlock = doc.blocks[2] as { items: Array<Record<string, unknown>> };
    const fourthBlock = doc.blocks[3] as { columns: Array<Record<string, unknown>> };

    expect(doc.title).toBe("Unknown Key Strip");
    expect(doc.blocks).toHaveLength(4);
    expect(firstBlock.unexpected).toBeUndefined();
    expect(secondBlock.items[0]?.unexpected).toBeUndefined();
    expect(thirdBlock.items[0]?.unexpected).toBeUndefined();
    expect(fourthBlock.columns[0]?.unexpected).toBeUndefined();
  });

  it("honors validation unknown_keys passthrough mode", async () => {
    const { doc } = await loadFixture("unknown-key-passthrough");
    const docRecord = doc as unknown as Record<string, unknown>;
    const block = doc.blocks[0] as unknown as { unexpected?: unknown; items: Array<Record<string, unknown>> };

    expect(docRecord.unexpected).toBe("value");
    expect(block.unexpected).toBe("value");
    expect(block.items[0]?.unexpected).toBe("value");
  });

  it("honors validation unknown_keys passthrough mode in include files", async () => {
    const { doc } = await loadFixture("include-passthrough");
    const block = doc.blocks[0] as unknown as { unexpected?: unknown; items: Array<Record<string, unknown>> };

    expect(block.unexpected).toBe("value");
    expect(block.items[0]?.unexpected).toBe("value");
  });

  it("uses passthrough semantics when strict is false and unknown_keys is error", async () => {
    const { doc } = await loadFixture("strict-false");
    const docRecord = doc as unknown as Record<string, unknown>;
    const block = doc.blocks[0] as unknown as Record<string, unknown>;

    expect(docRecord.unexpected).toBe("value");
    expect(block.unexpected).toBe("value");
  });

  it("resolves entry, theme, and include.base_dir relative to the config file", async () => {
    const nestedConfig = resolve(fixturesRoot, "minimal/docir.toml");
    const previousCwd = process.cwd();
    process.chdir(repoRoot);
    try {
      const { doc, theme, baseDir } = await loadProject({ configPath: nestedConfig });

      expect(baseDir).toBe(resolve(fixturesRoot, "minimal"));
      expect(doc.title).toBe("Minimal");
      expect(theme.name).toBe("default");
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("resolves configured site.out_dir relative to the config file", async () => {
    const nestedConfig = resolve(fixturesRoot, "minimal/docir.toml");
    const previousCwd = process.cwd();
    process.chdir(repoRoot);
    try {
      const { outFile } = await renderProject({ configPath: nestedConfig });

      expect(outFile).toBe(resolve(fixturesRoot, "minimal/dist/index.html"));
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("keeps explicit outDir relative to cwd", async () => {
    const nestedConfig = resolve(fixturesRoot, "minimal/docir.toml");
    const previousCwd = process.cwd();
    process.chdir(repoRoot);
    try {
      const { outFile } = await renderProject({ configPath: nestedConfig, outDir: "tmp/render-out" });

      expect(outFile).toBe(resolve(repoRoot, "tmp/render-out/index.html"));
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("uses single output mode by default without emitting asset files", async () => {
    const nestedConfig = resolve(fixturesRoot, "minimal/docir.toml");
    const { html, mode, assetFiles } = await renderProject({ configPath: nestedConfig, outDir: "tmp/single-out" });

    expect(mode).toBe("single");
    expect(assetFiles).toEqual([]);
    expect(html).toContain("<style>");
    expect(html).not.toContain("assets/agent-side.css");
  });

  it("emits renderer CSS as an asset in bundle mode", async () => {
    const nestedConfig = resolve(fixturesRoot, "minimal/docir.toml");
    const { html, mode, assetFiles } = await renderProject({ configPath: nestedConfig, outDir: "tmp/bundle-out", mode: "bundle" });

    expect(mode).toBe("bundle");
    expect(assetFiles).toEqual([resolve(repoRoot, "tmp/bundle-out/assets/agent-side.css")]);
    expect(html).toContain('href="assets/agent-side.css"');
    expect(html).not.toContain("<style>");
  });

  it("selects the plain HTML renderer from renderer.name", async () => {
    const { html, outFile, assetFiles } = await renderProject({ configPath: resolve(fixturesRoot, "minimal-plain/docir.toml"), outDir: "tmp/plain-out" });

    expect(outFile).toBe(resolve(repoRoot, "tmp/plain-out/index.html"));
    expect(assetFiles).toEqual([]);
    expect(html).toContain("<h1>Minimal Plain</h1>");
    expect(html).not.toContain("bootstrap.min.css");
    expect(html).toContain("<style>");
  });

  it("selects the Markdown renderer from renderer.name", async () => {
    const { html, outFile, assetFiles } = await renderProject({ configPath: resolve(fixturesRoot, "minimal-markdown/docir.toml"), outDir: "tmp/markdown-out" });

    expect(outFile).toBe(resolve(repoRoot, "tmp/markdown-out/index.md"));
    expect(assetFiles).toEqual([]);
    expect(html).toContain("# Minimal Markdown");
    expect(html).toContain("## Section");
    expect(html).toContain("| Name |");
    expect(html).not.toContain("<html");
  });
});

describe("renderer safety", () => {
  it("rejects unsupported Mermaid modes instead of silently degrading", async () => {
    const { config, doc, theme } = await loadFixture("minimal");
    config.renderer.mermaid.mode = "bundled";

    expect(() => renderDocument(doc, { config, theme })).toThrow(/bundled Mermaid assets are not implemented/);
  });

  it("does not render unsafe link schemes", async () => {
    const { config, theme } = await loadFixture("minimal");
    const html = renderDocument(
      {
        title: "Links",
        blocks: [
          {
            type: "cards",
            items: [{ title: "Unsafe card", href: "javascript:alert(1)" }],
          },
          {
            type: "reference",
            items: [{ label: "Unsafe reference", path: "javascript:alert(1)" }],
          },
        ],
      },
      { config, theme },
    );

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain('<a href="');
    expect(html).toContain("Unsafe reference");
  });

  it("escapes Markdown control syntax in plain text", () => {
    const markdown = renderMarkdownDocument({
      title: "Title [x](y)",
      description: "# not a heading",
      blocks: [
        {
          type: "paragraph",
          text: "- not a list\n[label](javascript:bad)\n<html>",
        },
        {
          type: "table",
          columns: [{ key: "text", label: "Pipe | Label" }],
          rows: [{ text: "cell | value\nnext line" }],
        },
        {
          type: "code",
          language: "md",
          code: "```inside```",
        },
      ],
    });

    expect(markdown).toContain("# Title \\[x\\]\\(y\\)");
    expect(markdown).toContain("\\# not a heading");
    expect(markdown).toContain("\\- not a list");
    expect(markdown).toContain("\\[label\\]\\(javascript:bad\\)");
    expect(markdown).toContain("\\<html\\>");
    expect(markdown).toContain("| Pipe \\| Label |");
    expect(markdown).toContain("| cell \\| value<br>next line |");
    expect(markdown).toContain("````md\n```inside```\n````");
  });

  it("renders compare values consistently with the bootstrap renderer", () => {
    const compare: Extract<Block, { type: "compare" }> = {
      type: "compare",
      title: "Options",
      options: [{ pros: ["fast", "cheap"], nested: { value: "x" } }],
    };
    const doc: DocIR = { title: "Compare", blocks: [compare] };

    const markdown = renderMarkdownDocument(doc);
    const bootstrap = renderBlock(compare, { headingLevel: 2 });

    expect(bootstrap).toContain("fast, cheap");
    expect(bootstrap).toContain("> x");
    expect(markdown).toContain("- **pros:** fast, cheap");
    expect(markdown).toContain("- **nested:** x");
  });

  it("escapes pipes in inline code inside Markdown table cells", () => {
    const markdown = renderMarkdownDocument({
      title: "Table",
      blocks: [
        {
          type: "table",
          columns: [{ key: "value", label: "Value" }],
          rows: [{ value: [{ type: "inlineCode", text: "a|b" }] }],
        },
      ],
    });

    expect(markdown).toContain("a\\|b");
  });

  it("preserves explicit line breaks in Markdown table cells", () => {
    const markdown = renderMarkdownDocument({
      title: "Table",
      blocks: [
        {
          type: "table",
          columns: [{ key: "value", label: "Value" }],
          rows: [{ value: [{ type: "text", text: "before" }, { type: "break" }, { type: "text", text: "after" }] }],
        },
      ],
    });

    expect(markdown).toContain("before<br>after");
  });

  it("escapes Markdown link destinations", () => {
    const markdown = renderMarkdownDocument({
      title: "Links",
      blocks: [
        {
          type: "cards",
          items: [{ title: "Card", href: "docs/a b) [extra](https://example.com" }],
        },
        {
          type: "reference",
          items: [{ label: "Reference", path: "docs/a b) [extra](https://example.com" }],
        },
      ],
    });

    expect(markdown).toContain("[Open](docs/a%20b%29%20[extra]%28https://example.com)");
    expect(markdown).toContain("[Reference](docs/a%20b%29%20[extra]%28https://example.com)");
    expect(markdown).not.toContain("] [extra](");
  });

  it("rejects invalid CLI output modes", () => {
    expect(() => parseOutputMode("bundel")).toThrow(/Invalid output mode/);
  });
});

describe("diff blocks", () => {
  it("renders raw and explicit diff lines as one side-by-side view", async () => {
    const { config, theme } = await loadFixture("minimal");
    const doc: DocIR = {
      title: "Diff",
      blocks: [
        {
          type: "diff",
          title: "Settings",
          language: "ts",
          left_label: "Expected",
          right_label: "Actual",
          lines: [
            "diff --git a/settings.ts b/settings.ts",
            "--- a/settings.ts",
            "+++ b/settings.ts",
            "@@ -1,4 +1,4 @@",
            " const keep = true;",
            {
              left: {
                line: 2,
                segments: [{ text: "const " }, { text: "oldName", mark: "removed" }, { text: " = value;" }],
              },
              right: {
                line: 2,
                segments: [{ text: "const " }, { text: "newName", mark: "added" }, { text: " = value;" }],
              },
            },
            { left: { line: 3, text: "const removedOnly = true;" } },
            { right: { line: 3, text: "const addedOnly = true;" } },
            {
              left: { line: 4, text: "const same = true;" },
              right: { line: 4, text: "const same = true;" },
            },
            "-const removed = true;",
            "+const added = true;",
            " export { value };",
          ],
        },
      ],
    };

    const bootstrap = renderDocument(doc, { config, theme });
    const plain = renderPlainDocument(doc, { config, theme, outputMode: "single" });
    const markdown = renderMarkdownDocument(doc);

    expect(bootstrap).toContain('<th colspan="2">Expected</th>');
    expect(bootstrap).toContain('<th colspan="2">Actual</th>');
    expect(bootstrap).toContain("doc-diff-inline-removed");
    expect(bootstrap).toContain("doc-diff-inline-added");
    expect(bootstrap).toContain("doc-diff-removed");
    expect(bootstrap).toContain("doc-diff-added");
    expect(bootstrap).toContain("doc-diff-context");
    expect(bootstrap).toContain('<td class="doc-diff-line">3</td>');
    expect(plain).toContain("doc-diff-table");
    expect(plain).toContain("const keep = true;");
    expect(markdown).toContain("## Settings");
    expect(markdown).toContain("```diff");
    expect(markdown).toContain("--- Expected");
    expect(markdown).toContain("+++ Actual");
    expect(markdown).toContain("-const oldName = value;");
    expect(markdown).toContain("+const newName = value;");
    expect(markdown).toContain("-const removedOnly = true;");
    expect(markdown).toContain("+const addedOnly = true;");
    expect(markdown).toContain(" const same = true;");
  });

  it("uses raw headers as fallback labels and preserves unbalanced raw change runs", async () => {
    const { config, theme } = await loadFixture("minimal");
    const doc: DocIR = {
      title: "Raw diff",
      blocks: [
        {
          type: "diff",
          lines: [
            "diff --git a/a.ts b/a.ts",
            "--- a/a.ts",
            "+++ b/a.ts",
            "@@ -10,3 +10,2 @@",
            "-first removed",
            "-second removed",
            "+replacement",
            "\\ No newline at end of file",
          ],
        },
      ],
    };

    const html = renderDocument(doc, { config, theme });
    const markdown = renderMarkdownDocument(doc);

    expect(html).toContain('<th colspan="2">a/a.ts</th>');
    expect(html).toContain('<th colspan="2">b/a.ts</th>');
    expect(html).toContain('<td class="doc-diff-line">10</td>');
    expect(html).toContain('<td class="doc-diff-line">11</td>');
    expect(html).toContain("doc-diff-meta");
    expect(markdown).toContain("-second removed");
    expect(markdown).toContain("+replacement");
  });

  it("keeps Markdown file headers ordered when it fills in a missing side", () => {
    const markdown = renderMarkdownDocument({
      title: "Partial header",
      blocks: [
        {
          type: "diff",
          left_label: "Expected",
          lines: ["+++ b/settings.ts", "@@ -1 +1 @@", "-old", "+new"],
        },
      ],
    });

    expect(markdown).toContain("--- Expected\n+++ b/settings.ts\n@@");
  });

  it("escapes untrusted diff headers, raw lines, and explicit segments", async () => {
    const { config, theme } = await loadFixture("minimal");
    const html = renderDocument(
      {
        title: "Unsafe diff",
        blocks: [
          {
            type: "diff",
            left_label: '<img src=x onerror="alert(1)">',
            lines: [
              "--- a/<img>",
              "+++ b/<script>",
              "@@ -1 +1 @@",
              "-<img src=x onerror=alert(1)>",
              {
                right: { line: 1, segments: [{ text: '<script>alert(1)</script>', mark: "added" }] },
              },
            ],
          },
        ],
      },
      { config, theme },
    );

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("rejects empty diff rows and ambiguous explicit sides", async () => {
    const { config } = await loadFixture("minimal");

    expect(() => validateDoc({ title: "Invalid", blocks: [{ type: "diff", lines: [{}] }] }, config)).toThrow(/Diff line must have a left or right side/);
    expect(() =>
      validateDoc(
        {
          title: "Invalid",
          blocks: [
            {
              type: "diff",
              lines: [{ left: { line: 1, text: "text", segments: [{ text: "text" }] } }],
            },
          ],
        },
        config,
      ),
    ).toThrow(/Diff side must have exactly one of text or segments/);
    expect(() =>
      validateDoc(
        {
          title: "Invalid",
          blocks: [{ type: "diff", lines: [{ right: { line: 0, text: "not a line number" } }] }],
        },
        config,
      ),
    ).toThrow(/Number must be greater than 0/);
  });
});

describe("public validation API", () => {
  it("uses the same page wrapper and unknown key policy as the loader", async () => {
    const { config } = await loadFixture("unknown-key-strip");
    const doc = validateDoc(
      {
        page: {
          title: "Wrapped",
          lead: "Lead text",
          unexpected: "value",
          blocks: [
            {
              type: "cards",
              title: "Cards",
              items: [{ title: "Card", body: "Body", unexpected: "value" }],
            },
          ],
        },
      },
      config,
    );
    const block = doc.blocks[0] as { items: Array<Record<string, unknown>> };

    expect(doc.title).toBe("Wrapped");
    expect(doc.description).toBe("Lead text");
    expect((doc as unknown as Record<string, unknown>).unexpected).toBeUndefined();
    expect(block.items[0]?.unexpected).toBeUndefined();
  });

  it("preserves unknown keys in passthrough mode", async () => {
    const { config } = await loadFixture("unknown-key-passthrough");
    const doc = validateDoc(
      {
        title: "Passthrough",
        unexpected: "value",
        blocks: [
          {
            type: "notice",
            body: "Body",
            unexpected: "value",
          },
        ],
      },
      config,
    );

    expect((doc as unknown as Record<string, unknown>).unexpected).toBe("value");
    expect((doc.blocks[0] as unknown as Record<string, unknown>).unexpected).toBe("value");
  });

  it("rejects recursive presentation keys", async () => {
    const { config } = await loadFixture("unknown-key-passthrough");

    expect(() =>
      validateDoc(
        {
          title: "Invalid",
          blocks: [
            {
              type: "cards",
              items: [{ title: "Card", body: "Body", style: "color:red" }],
            },
          ],
        },
        config,
      ),
    ).toThrow(/Presentation key "style" is not allowed/);
  });
});

describe("fixture-based validation failures", () => {
  it.each([
    ["invalid-table-array", /Invalid DocIR document.*rows.*Array-based table rows are forbidden/s],
    ["invalid-presentation-keys", /Invalid DocIR document.*class/s],
    ["missing-include", /Failed to read or parse included YAML.*missing\.yml/s],
    ["include-cycle", /Circular include detected.*a\.yml.*b\.yml.*a\.yml/s],
    ["parent-traversal", /Include escapes base_dir.*outside\.yml/s],
    ["include-symlink-escape", /Include escapes base_dir.*link\.yml/s],
    ["unknown-block", /Invalid DocIR document.*type/s],
    ["unknown-key", /Invalid DocIR document.*unexpected/s],
  ])("%s reports a readable error", async (fixture, expected) => {
    await expect(loadFixture(fixture)).rejects.toThrow(expected);
  });
});

async function renderFixture(name: string): Promise<{ html: string }> {
  const { config, doc, theme } = await loadFixture(name);
  return { html: renderDocument(doc, { config, theme }) };
}

async function loadFixture(name: string) {
  const fixtureRoot = resolve(fixturesRoot, name);
  const previousCwd = process.cwd();
  process.chdir(fixtureRoot);
  try {
    return await loadProject({ configPath: "docir.toml" });
  } finally {
    process.chdir(previousCwd);
  }
}
