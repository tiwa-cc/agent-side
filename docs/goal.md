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
