import { describe, expect, it } from "vitest";
import { resolve } from "pathe";
import { loadProject } from "../src/core/loadProject.js";
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

    expect(doc.title).toBe("Unknown Key Strip");
    expect(doc.blocks).toHaveLength(1);
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
