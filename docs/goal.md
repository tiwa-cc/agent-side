# Goal

## Project Definition

`agent-side` is an AI-safe document rendering layer for AI-assisted work.

Agents write structured meaning in YAML DocIR. Renderers convert that structure into human-readable output. Humans review the rendered result in a browser or another familiar format.

The project exists to prevent AI agents from directly editing fragile HTML, CSS, or ambiguous Markdown while still allowing them to express rich document structures.

`agent-side` is not primarily a static site generator. Static HTML output is one useful target, but the core value is safer human review of agent-generated documents.

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
Human-readable output
```

Generated HTML or Markdown is an output artifact. It is not the primary editing target.

## Problem

Markdown is easy to write, but it becomes ambiguous as documents grow.

Common problems:

* tables become hard to maintain
* custom extensions differ by renderer
* notices, cards, tabs, accordions, and diagrams are not standardized
* AI agents may break layout or semantics when editing raw HTML
* visual structure is difficult to review in plain text
* humans must read long AI-generated Markdown documents directly

`agent-side` introduces a structured document layer between AI output and rendered output.

## Design Principles

### 1. Do not let agents edit raw HTML

Agents must not directly generate or modify arbitrary HTML for normal document content.

Allowed in DocIR:

* structured YAML blocks
* semantic fields
* plain text content
* code blocks as content
* Mermaid diagram source
* limited semantic layout hints

Not allowed in DocIR:

* raw Bootstrap classes
* Tailwind utility classes
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

Important renderers:

1. Plain HTML
2. Bootstrap HTML
3. Markdown

Future renderers may include:

* Tailwind HTML
* PDF
* email HTML
* GitHub Pages
* WordPress blocks

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

### 5. Keep generated output small by default

The default output should be easy to delete, regenerate, ignore from Git, and compare.

The standard use case is human review of agent-generated documents, not full static site asset management.

## Document Model

The main document format is YAML.

TOML is used for project configuration.

Theme files should normally be YAML.

Recommended project structure:

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

### YAML DocIR example

```yaml
page:
  title: agent-side sample
  lang: en
  blocks:
    - type: notice
      tone: info
      title: Editing Rule
      body: Agents edit YAML DocIR, not raw HTML or CSS.

    - type: section
      title: Core Concept
      blocks:
        - type: paragraph
          text: DocIR captures document meaning in YAML.

        - type: mermaid
          title: Generation Flow
          diagram: |
            flowchart TD
              A[Agent or Human] --> B[DocIR YAML]
              B --> C[Loader]
              C --> D[Validator]
              D --> E[Renderer]
              E --> F[Readable HTML]
```

## Block Model

The architecture should allow these semantic block types:

* `page`
* `section`
* `text`
* `summary`
* `points`
* `steps`
* `notice`
* `cards`
* `table`
* `compare`
* `definition`
* `glossary`
* `keyValue`
* `code`
* `command`
* `output`
* `diff`
* `fileTree`
* `mermaid`
* `figure`
* `decision`
* `todo`
* `issue`
* `risk`
* `assumption`
* `constraint`
* `openQuestion`
* `quote`
* `reference`
* `linkList`

The first implementation does not need to support every block completely, but the architecture should allow new block renderers to be added cleanly.

## Validation Rules

Validation is a core feature, not an optional helper.

The validator is responsible for:

* checking block types
* checking required fields
* rejecting invalid fields
* rejecting unknown keys in strict mode
* rejecting forbidden presentation keys
* rejecting array-based table rows
* validating config files
* validating theme files

### Forbidden presentation keys

DocIR must reject fields such as:

* `class`
* `style`
* `margin`
* `padding`
* `font-size`
* `color`

These belong to renderer or theme layers, not to DocIR.

### Tables must not use two-dimensional arrays

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

## Loader and Include Resolution

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

Path resolution should be predictable. Includes should normally resolve relative to the including file.

## Renderer Strategy

Renderer implementations must consume validated, normalized AST data.

They should not parse raw YAML directly.

### Renderer priority

Recommended renderer priority:

1. Plain HTML Renderer
2. Bootstrap HTML Renderer
3. Markdown Renderer

Bootstrap HTML is already useful as an enhanced renderer, but Plain HTML should be treated as the baseline renderer because it best matches the default single-file review workflow.

Markdown should be included as the third target because it is useful for exporting agent-side documents back into existing documentation systems, README-like documents, and plain text review workflows.

### Plain HTML Renderer

A Plain HTML renderer should be implemented as the baseline renderer.

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

A Markdown renderer should be supported as an export renderer.

It should:

* export DocIR back into readable Markdown
* preserve semantic structure where possible
* degrade gracefully when Markdown has no equivalent structure
* avoid introducing renderer-specific requirements into DocIR
* support documentation workflows that still depend on Markdown

Markdown output may lose visual fidelity, but it should preserve meaning as much as possible.

Examples:

* `notice` may become a blockquote with a label
* `decision` may become a titled section
* `table` should remain a normal Markdown table when possible
* `mermaid` should become a fenced `mermaid` code block
* `cards` may become subsections or list items

## Renderer Output Requirements

Generated HTML should be readable, stable, and structurally correct.

### HTML language

The renderer must not hard-code `lang="en"`.

The HTML language should be configurable from project configuration or page metadata.

Preferred order:

1. `page.lang` in DocIR
2. `[site].lang` in `docir.toml`
3. fallback value such as `en`

Example:

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

Visual size may be adjusted with CSS classes, but the semantic heading level should remain correct.

### Clean class output

The renderer should avoid unstable or noisy HTML output.

Avoid:

```html
<section class="doc-section ">
```

Prefer:

```html
<section class="doc-section">
```

Class names should be joined safely and empty class tokens should be removed.

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

## Output Strategy

The default render output should be a single file.

Default HTML output:

```text
dist/
  index.html
```

The default mode should minimize generated files because AI agents may work in multiple git worktrees, branches, or parallel task directories.

Generated output should be easy to delete, regenerate, and ignore from version control.

### Output modes

The renderer should support output modes:

* `single`
* `bundle`
* `site`

### single mode

`single` is the default mode.

It should generate only the primary output file.

For HTML renderers:

```text
dist/index.html
```

For Markdown renderer:

```text
dist/index.md
```

In this mode:

* small renderer CSS should be embedded inline
* external frameworks may be loaded from CDN when appropriate
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

### Version control

Generated output directories such as `dist/` should normally be ignored by Git.

Test snapshots are different. Snapshot outputs under `tests/**/__snapshots__/` should remain under version control because they represent expected renderer behavior.

## Theme Strategy

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

The renderer maps theme tokens to actual output-specific styles.

DocIR may refer to semantic hints, but it should not contain raw presentation instructions.

## Mermaid Strategy

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

Mermaid rendering failure should not break the entire document.

Recommended fallback behavior:

* show the Mermaid source in a visible block
* display a clear error message near the diagram
* keep the rest of the document usable
* optionally expose the original Mermaid source for debugging

## Configuration

Project configuration should be stored in `docir.toml`.

Example:

```toml
[site]
title = "agent-side sample"
lang = "en"
entry = "docs/index.yml"
out_dir = "dist"

[renderer]
name = "plain"
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

## CLI Goals

The CLI should provide:

```text
agent-side init
agent-side validate
agent-side render
agent-side preview
```

Expected usage:

```bash
agent-side validate docs/index.yml
agent-side render docs/index.yml --out dist
agent-side render docs/index.yml --out dist --mode single
agent-side render docs/index.yml --out dist --mode bundle
agent-side render docs/index.yml --out dist --mode site
agent-side preview
```

## Library-first Architecture

`agent-side` should be designed as both a CLI tool and a reusable library.

The core implementation should be library-first.

The CLI should be a thin wrapper around the core library APIs.

Do not duplicate render or validation logic inside CLI command handlers.

### Library usage

The package should expose reusable APIs.

Documentation examples must match the actual exported TypeScript APIs. Do not write aspirational API examples in npm-facing documentation unless they are clearly marked as planned.

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

## npm Packaging and Distribution

The first distribution target should be a single npm package named `agent-side`.

The package should include:

* CLI entrypoint
* core library
* YAML DocIR loader
* TOML config loader
* include resolver
* validator
* normalizer
* Plain HTML renderer
* Bootstrap renderer
* Markdown renderer
* default themes
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

### Package shape

Recommended `package.json` shape:

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

Keep npm package build output separate from rendered document output.

```text
lib/   = TypeScript build output for npm package publication
dist/  = generated document/site output from `agent-side render`
```

Do not use `dist/` as the TypeScript package build output directory.

Both `lib/` and `dist/` are generated outputs and should normally be ignored by Git. They should not be committed.

Test snapshots are different and should remain under version control.

### TypeScript build configuration

`tsconfig.build.json` should emit package build output to `lib/`.

For the initial npm release, source maps and declaration maps should be intentionally disabled to keep the package small and reduce file-count noise.

Recommended settings:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "lib",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": false,
    "sourceMap": false,
    "noEmit": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/preview/**", "tests/**", "vite.config.ts"]
}
```

### npm publish contents

The published npm package should include only files needed by package users.

For the initial release, source map files should not be included in the published package.

Recommended published build artifacts:

```text
lib/**/*.js
lib/**/*.d.ts
```

Avoid publishing:

```text
lib/**/*.js.map
lib/**/*.d.ts.map
```

Rationale:

* most early users will use `agent-side` as a CLI
* source maps increase package file count and create noise when inspecting package contents
* TypeScript declaration files are useful for library users and should remain included
* source maps can be reintroduced later if library debugging becomes important

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

### Manual npm publication workflow

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
@agent-side/renderer-plain
@agent-side/renderer-markdown
@agent-side/preview
```

The initial architecture should make this split possible, but should not require it from day one.

## Testing Strategy

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

Snapshot tests should verify stable output and prevent accidental renderer regressions.

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

* `minimal`: verifies that the smallest valid document can be loaded, validated, normalized, and rendered
* `complex`: verifies that many block types can be rendered together in a stable document
* `invalid-table-array`: verifies that two-dimensional table rows are rejected
* `invalid-presentation-keys`: verifies that forbidden presentation keys are rejected
* `include-cycle`: verifies that circular includes are detected and reported
* `nested-headings`: verifies that heading levels are generated correctly for nested sections and blocks

The complex fixture should be treated as the normal-path integration fixture. It should include nested sections, tables, compare blocks, cards, Mermaid diagrams, decisions, risks, assumptions, constraints, open questions, file trees, commands, outputs, and checklist-like content.

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
render output
  ↓
compare with snapshot
```

The renderer should receive a validated, normalized AST. Tests should avoid passing raw YAML directly into the renderer.

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

Do not ignore `tests/**/__snapshots__/`.

## Documentation Policy

`README.md` is for users.

`docs/goal.md` is for maintainers, Codex, and architectural guidance.

README should stay concise and practical. It should explain installation, basic usage, renderer options, and the core concept.

`docs/goal.md` may contain deeper design rationale, implementation constraints, npm packaging rules, and testing strategy.

Do not copy every internal goal into README.

Documentation examples that are npm-facing must match actual exported APIs.

## Implementation Order

Recommended implementation direction:

1. Keep core library APIs stable enough for CLI reuse
2. Keep Plain HTML renderer as baseline
3. Keep Bootstrap renderer as enhanced preview output
4. Keep Markdown renderer as export output
5. Strengthen validation rules
6. Improve fixture coverage
7. Keep output mode behavior deterministic
8. Keep npm package contents small and clean
9. Add preview improvements only after core behavior is stable
10. Expand block types incrementally

## Responsibilities

### Loader

The loader is responsible for:

* reading YAML files
* resolving includes
* preventing invalid paths
* detecting circular includes
* returning a complete resolved document tree

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

* converting AST into human-readable output
* applying theme tokens
* escaping unsafe text
* rendering block types
* including required assets only when appropriate for the output mode
* handling Mermaid rendering mode
* generating stable output

### Preview

The preview system is responsible for:

* serving generated output locally
* optionally watching YAML, theme, and config changes
* re-rendering on change
* making human review easy

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

`agent-side` is an AI-safe document rendering layer.

Agents write structured meaning.

Renderers create human-readable output.

Humans review the result in a browser or another familiar review format.

The core value is not static site generation itself.

The core value is preventing AI agents from breaking documents while still allowing them to express rich information structures.
