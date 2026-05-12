# Goal

## Project Name

agent-side

## Purpose

agent-side is a document and site generation layer designed for AI agents.

The goal is to prevent AI agents from directly editing fragile HTML, CSS, or loosely structured Markdown.
Instead, agents should edit a structured document IR written in YAML.
The renderer then converts that structure into human-readable HTML.

Humans review the rendered result in a browser.

## Core Concept

Agents should write meaning, not presentation.

```text
Agent / Human
  ↓
YAML DocIR
  ↓
Loader
  ↓
Validator
  ↓
Normalized AST
  ↓
Renderer
  ↓
Readable HTML
```

The generated HTML is an output artifact.
It is not the primary editing target.

## Problem

Markdown is easy to write, but becomes ambiguous when documents grow.

Common problems:

* tables become hard to maintain
* custom extensions differ by renderer
* notices, cards, tabs, accordions, and diagrams are not standardized
* AI agents may break layout or semantics when editing raw HTML
* visual structure is difficult to review in plain text
* humans must read long AI-generated Markdown documents directly

agent-side solves this by introducing a structured document layer between AI output and rendered HTML.

## Design Principles

### 1. Do not let agents edit raw HTML

Agents must not directly generate or modify arbitrary HTML for normal document content.

Allowed:

* YAML DocIR
* structured blocks
* semantic fields
* Mermaid diagram source
* plain text content
* code blocks as content

Not allowed in DocIR:

* raw Bootstrap classes
* arbitrary inline styles
* arbitrary HTML layout
* CSS class tweaking
* pixel-level positioning

HTML generation is the renderer's responsibility.

### 2. DocIR represents meaning

DocIR should describe what a block means, not how it is styled.

Examples:

* `notice` means important information
* `decision` means an agreed decision
* `risk` means a known risk
* `compare` means comparison of options
* `mermaid` means a diagram source
* `cards` means grouped visual items

Renderer-specific details must stay outside DocIR.

### 3. Rendering is replaceable

The same DocIR should be renderable into different targets.

Potential renderers:

* Bootstrap HTML
* Tailwind HTML
* Plain HTML
* PDF
* email HTML
* Markdown
* GitHub Pages
* WordPress blocks

The first renderer should be Bootstrap HTML.

### 4. Theme is external

Rendering adjustments must not be embedded in the document body.

Use external theme files for visual rules.

DocIR may contain limited semantic layout hints such as:

* `layout: 1col | 2col | 3col | sidebar`
* `width: normal | wide | full`
* `align: left | center | right`
* `tone: info | success | warning | danger | neutral`
* `priority: low | normal | high`

DocIR must not contain:

* `class`
* `style`
* `margin`
* `padding`
* `font-size`
* `color`
* renderer-specific class names

### 5. YAML is the document format

The main document structure should be YAML.

TOML is used only for project configuration.

Recommended structure:

```text
agent-side/
  docir.toml
  docs/
    index.yml
    sections/
      concept.yml
      renderer.yml
  themes/
    default.yml
  dist/
```

### 6. File splitting is YAML-based

Large documents should be split into YAML files.

Use include blocks:

```yaml
type: include
src: ./sections/concept.yml
```

Include resolution is the loader's responsibility.

The renderer should receive a fully resolved normalized AST and should not care about file boundaries.

The loader must detect:

* missing include files
* circular includes
* parent directory traversal when disabled
* invalid YAML
* invalid included block type

### 7. Mermaid is renderer-managed

DocIR may contain Mermaid source.

Example:

```yaml
type: mermaid
title: Generation Flow
diagram: |
  flowchart TD
    A[Agent] --> B[DocIR YAML]
    B --> C[Validator]
    C --> D[Renderer]
    D --> E[Readable HTML]
```

DocIR stores the diagram source.
The renderer decides how Mermaid is rendered.

Supported Mermaid modes should be configurable:

* `cdn`
* `bundled`
* `pre_rendered`

### 8. Tables must not use two-dimensional arrays

Two-dimensional arrays are forbidden because they are position-dependent and easy for AI agents to break.

Do not use:

```yaml
rows:
  - [Bootstrap, easy, good]
  - [Tailwind, flexible, complex]
```

Use key-value rows instead:

```yaml
type: table
title: Renderer Comparison
columns:
  - key: renderer
    label: Renderer
  - key: merit
    label: Merit
  - key: concern
    label: Concern
rows:
  - renderer: Bootstrap
    merit: Many components are available
    concern: Appearance may feel Bootstrap-like
  - renderer: Tailwind
    merit: Flexible design
    concern: Renderer needs more design rules
```

The validator should reject array-based table rows.

## Initial Block Types

The system should support these semantic block types eventually:

* page
* section
* text
* summary
* points
* steps
* notice
* cards
* table
* compare
* definition
* glossary
* keyValue
* code
* command
* output
* diff
* fileTree
* mermaid
* figure
* decision
* todo
* issue
* risk
* assumption
* constraint
* openQuestion
* quote
* reference
* linkList

The first implementation does not need to support all of them completely, but the architecture should allow them to be added cleanly.

## Configuration

Project configuration should be stored in `docir.toml`.

Example:

```toml
[site]
title = "agent-side sample"
entry = "docs/index.yml"
out_dir = "dist"

[renderer]
name = "bootstrap"
theme = "default"

[renderer.mermaid]
mode = "cdn"

[include]
base_dir = "docs"
allow_parent = false

[validation]
strict = true
unknown_keys = "error"

[theme]
path = "themes/default.yml"
```

## Theme

Visual rendering rules should be stored outside DocIR.

Example:

```yaml
name: default

blocks:
  page:
    container: lg

  section:
    spacing: normal
    heading: h2

  cards:
    gap: normal
    border: true
    shadow: sm
    radius: md

  notice:
    style: soft
```

The renderer maps theme tokens to actual Bootstrap classes or other output-specific styles.

## Suggested TypeScript Stack

Use TypeScript for the first implementation.

Recommended libraries:

* `typescript`
* `tsx`
* `zod`
* `yaml`
* `smol-toml`
* `commander`
* `consola`
* `pathe`
* `fs-extra`
* `chokidar`
* `eta`
* `html-escaper`
* `sirv`
* `mermaid`
* `vite`
* `vitest`
* `happy-dom`
* `eslint`
* `prettier`

## CLI Goals

The CLI should eventually provide:

```text
agent-side init
agent-side validate
agent-side render
agent-side preview
```

Expected behavior:

```text
agent-side validate docs/index.yml
agent-side render docs/index.yml --out dist
agent-side preview
```

## Implementation Order

Recommended order:

1. Create project structure
2. Load `docir.toml`
3. Load YAML DocIR
4. Resolve include blocks
5. Define Zod schemas
6. Validate DocIR
7. Normalize into AST
8. Implement Bootstrap renderer
9. Output `dist/index.html`
10. Add snapshot tests
11. Add preview server
12. Add Mermaid rendering support
13. Add theme support
14. Expand block types

## Renderer Output Requirements

The generated HTML should be readable, stable, and structurally correct.

### HTML language

The renderer must not hard-code `lang="en"`.

The HTML language should be configurable from project configuration or page metadata.

Preferred order:

1. `page.lang` in DocIR
2. `[site].lang` in `docir.toml`
3. fallback value such as `en`

Example:

```toml
[site]
lang = "ja"
```

The generated HTML should use:

```html
<html lang="ja">
```

### Heading hierarchy

The renderer must preserve a correct heading hierarchy.

Do not render every block title as `h2`.

The renderer should track nesting depth and choose headings accordingly.

Example:

```html
<h1>Page Title</h1>
<section>
  <h2>Top Level Section</h2>
  <section>
    <h3>Nested Block Title</h3>
  </section>
</section>
```

Decision, risk, notice, mermaid, cards, table, and similar block titles should use a heading level appropriate to their nesting depth.

Visual size may be adjusted with classes such as `h5`, but the semantic heading level should remain correct.

### Clean class output

The renderer should avoid unstable or noisy HTML output.

Avoid outputs such as:

```html
<section class="doc-section ">
```

Prefer:

```html
<section class="doc-section">
```

Class names should be joined safely and empty class tokens should be removed.

### Mermaid fallback

Mermaid diagrams should not break the entire document when rendering fails.

The renderer or preview layer should support a safe fallback strategy.

Recommended behavior:

* render Mermaid source in a visible block if Mermaid rendering fails
* show a clear error message near the diagram
* keep the rest of the document usable
* optionally expose the original Mermaid source for debugging

Mermaid rendering mode remains renderer-managed and configurable.

### Accessibility

Use semantic HTML where practical.

Examples:

* `main` for the document body
* `section` for document sections
* `article` for standalone semantic blocks such as decisions or risks
* `table`, `thead`, `tbody`, `th`, and `td` for tables
* `scope="col"` for table headers

Notice-like blocks may use `role="note"` by default.
Use stronger roles such as `role="alert"` only when the content should interrupt assistive technology users.

### Snapshot targets

Renderer snapshot tests should cover at least these block types:

* notice
* section
* mermaid
* decision
* table
* cards
* risk
* include-resolved documents
* nested heading structures

Snapshot tests should verify stable HTML output and prevent accidental renderer regressions.

## Responsibilities

### Loader

The loader is responsible for:

* reading YAML files
* resolving includes
* preventing invalid paths
* detecting circular includes
* returning a complete unresolved or resolved document tree

### Validator

The validator is responsible for:

* checking block types
* rejecting invalid fields
* rejecting unknown keys in strict mode
* rejecting array-based table rows
* checking required fields
* validating config and theme files

### Normalizer

The normalizer is responsible for:

* converting valid DocIR into a stable internal AST
* applying defaults
* resolving shorthand forms if supported
* preparing data for renderer consumption

### Renderer

The renderer is responsible for:

* converting AST into HTML
* applying theme tokens
* escaping unsafe text
* rendering block types
* including required assets
* handling Mermaid rendering mode
* generating readable output

### Preview

The preview system is responsible for:

* serving generated HTML locally
* optionally watching YAML/theme/config changes
* re-rendering on change
* making human review easy

## Output Strategy

The default render output should be a single HTML file.

Default output:

```text
dist/
  index.html
```

The default mode should minimize generated files because AI agents may work in multiple git worktrees, branches, or parallel task directories.
Generated output should be easy to delete, regenerate, and ignore from version control.

The standard use case is human review of agent-generated documents, not full static site asset management.

### Output modes

The renderer should support output modes:

* `single`
* `bundle`
* `site`

### single mode

`single` is the default mode.

It should generate only:

```text
dist/index.html
```

In this mode:

* small renderer CSS should be embedded inline
* Bootstrap may be loaded from CDN
* Mermaid may be loaded from CDN
* no asset files should be emitted unless explicitly requested
* output should remain deterministic and easy to snapshot

Example:

```bash
agent-side render docs/index.yml --out dist
agent-side render docs/index.yml --out dist --mode single
```

Both commands should produce the same default single-file output.

### bundle mode

`bundle` mode may generate assets for offline distribution.

Example:

```text
dist/
  index.html
  assets/
    bootstrap.css
    mermaid.js
    agent-side.css
```

Use this mode when the generated document must be opened offline or distributed as a self-contained folder.

Example:

```bash
agent-side render docs/index.yml --out dist --mode bundle
```

### site mode

`site` mode may generate multiple pages and assets.

Example:

```text
dist/
  index.html
  pages/
    renderer.html
    schema.html
  assets/
    agent-side.css
```

This mode is for static site use cases and should not be the default.

Example:

```bash
agent-side render docs/index.yml --out dist --mode site
```

### Mermaid and assets

Mermaid rendering should follow the selected output mode.

Recommended defaults:

* `single`: load Mermaid from CDN or inline only when explicitly configured
* `bundle`: copy Mermaid runtime into `dist/assets/`
* `site`: use shared assets for multiple pages
* `pre_rendered`: render diagrams to static SVG/PNG when implemented

The default should avoid emitting extra files.

### CSS and framework assets

Framework and renderer CSS should follow the selected output mode.

Recommended defaults:

* `single`: avoid extra emitted asset files; use inline CSS or CDN only when appropriate
* `bundle`: copy CSS assets into `dist/assets/`
* `site`: emit shared CSS assets for multiple pages

DocIR must not change based on output mode.
Only the renderer output strategy should change.

### Renderer priority

The renderer roadmap should prioritize review-friendly output and low file count.

Recommended renderer priority:

1. Plain HTML Renderer
2. Bootstrap HTML Renderer
3. Markdown Renderer

Bootstrap HTML is already being implemented and may remain the first working enhanced renderer.
However, Plain HTML should be treated as the baseline renderer because it best matches the default `single` output mode.

Markdown should be included as the third target because it is useful for exporting agent-side documents back into existing documentation systems, GitHub README-like documents, and plain text review workflows.

### Plain HTML Renderer

A Plain HTML renderer should be implemented as a baseline renderer.

It should:

* generate readable HTML without external CSS frameworks
* work well with `single` output mode
* embed small default CSS inline
* avoid emitting extra files by default
* serve as a stable baseline for snapshot tests
* support the same normalized AST as other renderers
* avoid renderer-specific requirements in DocIR
* keep output deterministic and easy to diff

The Plain HTML renderer may be less visually rich than Bootstrap, but it should be reliable, dependency-light, and suitable for AI-assisted document review.

### Bootstrap HTML Renderer

The Bootstrap renderer should be treated as an enhanced renderer.

It should:

* produce a more polished preview than Plain HTML
* map semantic DocIR blocks to Bootstrap components
* keep Bootstrap classes inside the renderer only
* support `single`, `bundle`, and `site` output strategies
* avoid leaking Bootstrap-specific fields into DocIR

Bootstrap may use CDN assets in `single` mode and bundled assets in `bundle` mode.

### Markdown Renderer

A Markdown renderer should be planned as the third renderer target.

It should:

* export DocIR back into readable Markdown
* preserve semantic structure where possible
* degrade gracefully when Markdown has no equivalent structure
* avoid introducing renderer-specific requirements into DocIR
* support documentation workflows that still depend on Markdown

Markdown output may lose some visual fidelity, but it should preserve meaning as much as possible.

Examples:

* `notice` may become a blockquote with a label
* `decision` may become a titled section
* `table` should remain a normal Markdown table when possible
* `mermaid` should become a fenced `mermaid` code block
* `cards` may become subsections or list items

### Version control

Generated output directories such as `dist/` should normally be ignored by Git.

Test snapshots are different.
Snapshot outputs under `tests/**/__snapshots__/` should remain under version control because they represent expected renderer behavior.

## Distribution and Library Design

agent-side should be designed as both a CLI tool and a reusable library.

The core implementation should be library-first.
The CLI should be a thin wrapper around the core library APIs.

### Initial distribution

The first distribution target should be a single npm package named `agent-side`.

The package should include:

* CLI entrypoint
* core library
* YAML DocIR loader
* TOML config loader
* include resolver
* validator
* normalizer
* Bootstrap renderer
* default theme
* init templates

Users should be able to run:

```bash
npx agent-side init
npx agent-side validate docs/index.yml
npx agent-side render docs/index.yml --out dist
npx agent-side preview
```

Users should also be able to install it as a development dependency:

```bash
pnpm add -D agent-side
pnpm agent-side render
```

### Library usage

The package should expose reusable APIs.

Documentation examples must match the actual exported TypeScript APIs.
Do not write aspirational API examples in npm-facing documentation unless they are clearly marked as planned.

Current low-level usage example:

```ts
import {
  loadConfig,
  loadDoc,
  validateDoc,
  normalizeDoc,
  renderBootstrapHtml,
} from "agent-side";

const config = await loadConfig("docir.toml");
const doc = await loadDoc(config.site.entry, config);
const validDoc = validateDoc(doc, config);
const ast = normalizeDoc(validDoc);
const html = await renderBootstrapHtml(ast, config);
```

If the implementation changes, this example must be updated in the same pull request.

A higher-level API should also be provided:

```ts
import { renderProject } from "agent-side";

await renderProject({
  configPath: "docir.toml",
});
```

The CLI should call these same library APIs internally.
Do not duplicate render or validation logic inside CLI command handlers.

### Package shape

The npm package name should be `agent-side` if the name is available on npm.

Recommended initial `package.json` shape:

```json
{
  "name": "agent-side",
  "version": "0.1.0",
  "description": "AI-safe document rendering layer where agents write structured meaning and renderers generate human-readable output.",
  "type": "module",
  "license": "MIT",
  "homepage": "https://github.com/tiwa-cc/agent-side#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tiwa-cc/agent-side.git"
  },
  "bugs": {
    "url": "https://github.com/tiwa-cc/agent-side/issues"
  },
  "keywords": [
    "ai",
    "ai-agent",
    "document-generation",
    "yaml",
    "renderer",
    "typescript",
    "bootstrap",
    "mermaid",
    "static-site-generator",
    "docir"
  ],
  "bin": {
    "agent-side": "./lib/cli/main.js"
  },
  "exports": {
    ".": "./lib/index.js",
    "./core": "./lib/core/index.js",
    "./renderer/bootstrap": "./lib/renderer/bootstrap/index.js",
    "./renderer/plain": "./lib/renderer/plain/index.js",
    "./renderer/markdown": "./lib/renderer/markdown/index.js"
  },
  "types": "./lib/index.d.ts",
  "files": [
    "lib",
    "templates",
    "themes",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsx src/cli/main.ts",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build && pnpm test"
  }
}
```

### Build output convention

The project must keep npm package build output separate from rendered document output.

Use this convention:

```text
lib/   = TypeScript build output for npm package publication
dist/  = generated document/site output from `agent-side render`
```

`lib/` should contain compiled JavaScript and declaration files produced from `src/`.
`dist/` should contain generated HTML output such as `dist/index.html`.

Do not use `dist/` as the TypeScript package build output directory.
This prevents npm package artifacts from being mixed with generated review HTML.

Both `lib/` and `dist/` are generated outputs and should normally be ignored by Git.
They should not be committed.

Test snapshots are different and should remain under version control.

### TypeScript build configuration

`tsconfig.build.json` should emit package build output to `lib/`.

Recommended shape:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "lib",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/preview/**", "tests/**", "vite.config.ts"]
}
```

### npm publish contents

The published npm package should include only files needed by package users.

Expected included files:

```text
lib/
templates/
themes/
README.md
LICENSE
package.json
```

Expected excluded files:

```text
src/
tests/
coverage/
dist/
.env
.vscode/
docs/goal.md
```

Use the `files` whitelist in `package.json` to control published contents.

Before publishing, verify contents with:

```bash
npm pack --dry-run
```

### CLI shebang

The CLI source file must start with a Node.js shebang.

```ts
#!/usr/bin/env node
```

The shebang must be on its own first line.

After build, the compiled CLI entrypoint must also start with:

```js
#!/usr/bin/env node
```

The npm `bin` field should point to the compiled CLI file under `lib/`.

### npm publication workflow

The first npm publication may be done manually.

Recommended manual verification flow:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
npm pack --dry-run
```

Optional tarball test:

```bash
npm pack
mkdir -p /tmp/agent-side-publish-test
cd /tmp/agent-side-publish-test
npm init -y
npm install /path/to/agent-side/agent-side-0.1.0.tgz
npx agent-side --help
npx agent-side init
npx agent-side validate docs/index.yml
npx agent-side render docs/index.yml --out dist
```

Do not publish unless build, tests, package contents, and tarball usage have been reviewed.

The actual publish command for the unscoped package is:

```bash
npm publish
```

If the package is ever renamed to a scoped package, use public access explicitly:

```bash
npm publish --access public
```

Future automation may use npm Trusted Publishing from GitHub Actions, but the first release can be manual.

### Internal structure

The source tree should keep core logic separate from CLI and preview code.

Recommended structure:

```text
src/
  core/
    renderProject.ts
    validateProject.ts
    loadProject.ts

  config/
  loader/
  schema/
  ast/

  renderer/
    bootstrap/

  cli/
  preview/
```

The CLI should depend on `core/`.
The renderer should consume validated, normalized AST data.
The preview system should also call core APIs instead of reimplementing loading or rendering.

### Future package split

Do not start with a multi-package monorepo unless it becomes necessary.

Begin with one package:

```text
agent-side
```

If the project grows, it may later be split into:

```text
@agent-side/core
@agent-side/cli
@agent-side/renderer-bootstrap
@agent-side/renderer-tailwind
@agent-side/renderer-markdown
@agent-side/preview
```

The initial architecture should make this split possible, but should not require it from day one.

### Distribution principles

* Prefer npm distribution first.
* Keep the CLI thin.
* Keep core logic reusable.
* Keep renderer implementations replaceable.
* Include templates and default themes in the published package.
* Run build and tests before publishing.
* Do not make generated `dist/` project output part of source control unless it is part of package build output.

## Testing

Renderer snapshot tests should cover at least:

* notice
* section
* mermaid
* decision
* table
* cards
* risk
* include-resolved documents
* nested heading structures

Snapshot tests should verify stable HTML output and prevent accidental renderer regressions.

### Fixture-based tests

Test inputs should be stored as fixtures under `tests/fixtures/`.

Recommended structure:

```text
tests/
  fixtures/
    minimal/
      docir.toml
      docs/
        index.yml
      themes/
        default.yml

    complex/
      docir.toml
      docs/
        index.yml
      themes/
        default.yml

    invalid-table-array/
      docir.toml
      docs/
        index.yml
      themes/
        default.yml

    invalid-presentation-keys/
      docir.toml
      docs/
        index.yml
      themes/
        default.yml

    include-cycle/
      docir.toml
      docs/
        index.yml
        a.yml
        b.yml
      themes/
        default.yml

    nested-headings/
      docir.toml
      docs/
        index.yml
      themes/
        default.yml
```

Each fixture should be self-contained and include its own `docir.toml`, entry YAML file, and theme file.

### Fixture purposes

Use separate fixtures for separate test purposes.

* `minimal`: verifies that the smallest valid document can be loaded, validated, normalized, and rendered.
* `complex`: verifies that many block types can be rendered together in a stable document.
* `invalid-table-array`: verifies that two-dimensional table rows are rejected.
* `invalid-presentation-keys`: verifies that forbidden keys such as `class`, `style`, `margin`, `padding`, `font-size`, and `color` are rejected.
* `include-cycle`: verifies that circular includes are detected and reported.
* `nested-headings`: verifies that heading levels are generated correctly for nested sections and blocks.

The complex fixture should be treated as the normal-path integration fixture.
It should include nested sections, tables, compare blocks, cards, Mermaid diagrams, decisions, risks, assumptions, constraints, open questions, file trees, commands, outputs, and checklist-like content.

### Snapshot test flow

A renderer snapshot test should follow this flow:

```text
fixture directory
  ↓
load docir.toml
  ↓
load entry YAML
  ↓
resolve includes
  ↓
validate
  ↓
normalize
  ↓
render HTML
  ↓
compare with snapshot
```

The renderer should receive a validated, normalized AST.
Tests should avoid passing raw YAML directly into the renderer.

### Negative tests

Invalid fixtures should assert that validation or loading fails with a readable error.

Negative test cases should include at least:

* array-based table rows
* forbidden presentation keys
* missing include file
* include cycle
* parent directory traversal when disabled
* unknown block type in strict mode
* unknown keys in strict mode

Negative tests should verify not only that an error occurs, but also that the error message identifies the file, block, or field that caused the problem when possible.

### Snapshot updates

Use explicit snapshot update commands when output changes are intentional.

Recommended scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:update": "vitest -u",
    "test:watch": "vitest --watch"
  }
}
```

Use `pnpm test:update` only when renderer output changes are expected and reviewed.

## Non-Goals

This project is not:

* a full website builder
* a WYSIWYG editor
* a Markdown extension format
* a replacement for all static site generators
* a Bootstrap clone
* an HTML5 specification wrapper
* a free-form CSS layout system

The goal is not to support every possible visual expression.

The goal is to let agents safely produce structured documents that humans can comfortably review.

## Product Definition

agent-side is an AI-safe document rendering layer.

Agents write structured meaning.
Renderers create human-readable output.
Humans review the result in a browser.

The core value is not static site generation itself.

The core value is preventing AI agents from breaking documents while still allowing them to express rich information structures.
