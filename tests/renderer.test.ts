import { describe, expect, it } from "vitest";
import { resolve } from "pathe";
import type { DocirConfig } from "../src/config/configSchema.js";
import { loadProject } from "../src/core/loadProject.js";
import { renderProject } from "../src/core/renderProject.js";
import { validateDoc } from "../src/core/validateDoc.js";
import { renderDocument } from "../src/renderer/bootstrap/renderDocument.js";

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
