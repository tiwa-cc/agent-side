import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "pathe";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { loadProject } from "../src/core/loadProject.js";
import { validateDoc } from "../src/core/validateDoc.js";
import { migrateMarkdown, migrateMarkdownFile } from "../src/migration/markdown.js";
import { renderDocument } from "../src/renderer/bootstrap/renderDocument.js";
import { renderMarkdownDocument } from "../src/renderer/markdown/renderDocument.js";
import { renderPlainDocument } from "../src/renderer/plain/renderDocument.js";
import { docSchema } from "../src/schema/docSchema.js";

const repoRoot = process.cwd();
const minimalConfig = resolve(repoRoot, "tests/fixtures/minimal/docir.toml");
const stripConfig = resolve(repoRoot, "tests/fixtures/unknown-key-strip/docir.toml");

describe("Markdown migration", () => {
  it("converts GFM blocks and inline content into valid DocIR", () => {
    const result = migrateMarkdown(
      [
        "# Migration sample",
        "",
        "Intro with **strong**, *emphasis*, ~~removed~~, `code`, [link](https://example.com), and ![image](img.png).",
        "",
        "## Details",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "2. second",
        "",
        "- [x] done",
        "- [ ] pending",
        "",
        "> quoted text",
        "",
        "| Name | Value |",
        "| --- | --- |",
        "| A | **B** |",
        "",
        "```ts",
        "const value = 1;",
        "```",
      ].join("\n"),
      { sourcePath: "README.md" },
    );

    expect(result.warnings).toEqual([]);
    expect(result.doc.title).toBe("Migration sample");
    expect(result.doc.blocks[0]).toMatchObject({ type: "paragraph" });
    expect(result.doc.blocks[1]).toMatchObject({ type: "section", title: "Details" });
    const details = result.doc.blocks[1] as { blocks: Array<{ type: string }> };
    expect(details.blocks.some((block) => block.type === "checklist")).toBe(true);

    const paragraph = result.doc.blocks[0] as { text: unknown[] };
    expect(paragraph.text).toEqual(expect.arrayContaining([expect.objectContaining({ type: "strong" }), expect.objectContaining({ type: "link" }), expect.objectContaining({ type: "image" })]));

    const parsed = docSchema.parse(result.doc);
    expect(parsed.title).toBe("Migration sample");
    expect(renderMarkdownDocument(result.doc)).toContain("**strong**");
  });

  it("uses an explicit title, then the source filename when no h1 exists", () => {
    expect(migrateMarkdown("No heading", { sourcePath: "docs/example.md" }).doc.title).toBe("example");
    expect(migrateMarkdown("No heading", { title: "Explicit title", sourcePath: "docs/example.md" }).doc.title).toBe("Explicit title");
  });

  it.each([
    ["an empty Markdown link", "[](https://example.com)"],
    ["an empty HTML anchor", '<a href="#top"></a>'],
    ["an empty strong element", "<strong></strong>"],
    ["an empty emphasis element", "<em></em>"],
    ["an empty deletion element", "<del></del>"],
  ])("does not abort migration for %s", (_label, source) => {
    expect(() => migrateMarkdown(source)).not.toThrow();
  });

  it("keeps the first h1 as content when an explicit document title overrides it", () => {
    const result = migrateMarkdown(["# Real Heading", "", "body"].join("\n"), { title: "Override" });

    expect(result.doc).toMatchObject({
      title: "Override",
      blocks: [{ type: "section", title: "Real Heading", blocks: [{ type: "paragraph", text: "body" }] }],
    });
  });

  it("warns and safely falls back for unsafe links and unsupported HTML", async () => {
    const result = migrateMarkdown('<strong class="custom">safe</strong> <script>alert(1)</script> [bad](javascript:alert(1)) ![bad](javascript:image)', { sourcePath: "input.md" });

    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    expect(result.warnings.some((warning) => warning.message.includes("Unsafe link"))).toBe(true);
    expect(result.warnings.some((warning) => warning.message.includes("Unsafe image"))).toBe(true);
    expect(result.warnings.some((warning) => warning.message.includes("attribute \"className\""))).toBe(true);
    expect(JSON.stringify(result.doc)).not.toContain("<script>");
    expect(JSON.stringify(result.doc)).not.toContain("className");

    const { doc, config, theme } = await loadProject({ configPath: minimalConfig });
    const bootstrap = renderDocument(result.doc, { config, theme });
    const plain = renderPlainDocument(result.doc, { config, theme, outputMode: "single" });
    expect(bootstrap).toContain("<strong>safe</strong>");
    expect(plain).toContain("<strong>safe</strong>");
    expect(bootstrap).not.toContain("<script>");
    expect(bootstrap).not.toContain("javascript:");
    expect(doc.title).toBe("Minimal");
  });

  it("writes YAML, refuses accidental overwrite, and supports --force behavior", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "agent-side-migrate-"));
    const input = resolve(root, "README.md");
    const output = resolve(root, "docs/index.yml");
    try {
      await writeFile(input, "# Generated\n\nHello **world**.", "utf8");
      const result = await migrateMarkdownFile({ inputPath: input, outputPath: output });
      expect(result.doc.title).toBe("Generated");
      expect(parse(await readFile(output, "utf8"))).toMatchObject({ title: "Generated" });
      await expect(migrateMarkdownFile({ inputPath: input, outputPath: output })).rejects.toThrow(/already exists/);
      await expect(migrateMarkdownFile({ inputPath: input, outputPath: output, force: true })).resolves.toMatchObject({ doc: { title: "Generated" } });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves inline formatting and task state when flattening nested lists", () => {
    const result = migrateMarkdown(
      ["- parent", "  - **nested** [link](https://example.com)", "  - [x] checked"].join("\n"),
    );
    const list = result.doc.blocks[0] as { type: "list"; items: unknown[] };
    const item = list.items[0];

    expect(item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "strong" }),
        expect.objectContaining({ type: "link", href: "https://example.com" }),
      ]),
    );
    expect(JSON.stringify(item)).toContain("[x]");
  });

  it("strips unknown keys inside inline nodes in strip mode", async () => {
    const { config } = await loadProject({ configPath: stripConfig });
    const doc = validateDoc(
      {
        title: "Inline strip",
        blocks: [
          {
            type: "paragraph",
            text: [{ type: "strong", unexpected: "remove", children: [{ type: "text", text: "safe", unexpected: "remove" }] }],
          },
        ],
      },
      config,
    );
    const text = (doc.blocks[0] as { text: Array<{ children: Array<Record<string, unknown>> }> }).text;
    expect(text[0]).not.toHaveProperty("unexpected");
    expect(text[0]?.children[0]).not.toHaveProperty("unexpected");
  });
});
