import { describe, expect, it } from "vitest";
import { resolve } from "pathe";
import { loadConfig } from "../src/config/loadConfig.js";
import { loadDoc } from "../src/loader/loadDoc.js";
import { renderDocument } from "../src/renderer/bootstrap/renderDocument.js";

const repoRoot = process.cwd();
const fixturesRoot = resolve(repoRoot, "tests/fixtures");

describe("fixture-based rendering", () => {
  it("loads, validates, normalizes, and renders the minimal fixture", async () => {
    const { html } = await renderFixture("minimal");

    expect(html).toContain("<h1>Minimal</h1>");
    expect(html).toContain('<html lang="en">');
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
  const { config, doc } = await loadFixture(name);
  return { html: renderDocument(doc, { config }) };
}

async function loadFixture(name: string) {
  const fixtureRoot = resolve(fixturesRoot, name);
  const previousCwd = process.cwd();
  process.chdir(fixtureRoot);
  try {
    const config = await loadConfig("docir.toml");
    const doc = await loadDoc(config.site.entry, config);
    return { config, doc };
  } finally {
    process.chdir(previousCwd);
  }
}
