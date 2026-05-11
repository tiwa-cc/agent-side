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
