import type { DiffBlock, DiffLine, DiffSegment, DiffSide } from "../ast/types.js";
import { escapeHtml as escape } from "../utils/html.js";

interface DisplaySide {
  line?: number;
  segments: DiffSegment[];
}

interface DisplayRow {
  kind: "row";
  left?: DisplaySide;
  right?: DisplaySide;
}

interface DisplayMeta {
  kind: "meta";
  text: string;
}

type DisplayLine = DisplayRow | DisplayMeta;

export interface NormalizedDiff {
  leftLabel?: string;
  rightLabel?: string;
  lines: DisplayLine[];
}

export function normalizeDiff(block: DiffBlock): NormalizedDiff {
  let oldLine: number | undefined;
  let newLine: number | undefined;
  let parsedLeftLabel: string | undefined;
  let parsedRightLabel: string | undefined;
  const lines: DisplayLine[] = [];

  for (let index = 0; index < block.lines.length; index += 1) {
    const entry = block.lines[index];
    if (entry === undefined) continue;
    if (typeof entry !== "string") {
      lines.push(explicitRow(entry));
      if (entry.left) oldLine = entry.left.line + 1;
      if (entry.right) newLine = entry.right.line + 1;
      continue;
    }

    if (entry.startsWith("--- ")) {
      parsedLeftLabel = diffLabel(entry.slice(4));
      continue;
    }
    if (entry.startsWith("+++ ")) {
      parsedRightLabel = diffLabel(entry.slice(4));
      continue;
    }

    const hunk = parseHunk(entry);
    if (hunk) {
      oldLine = hunk.oldLine;
      newLine = hunk.newLine;
      lines.push({ kind: "meta", text: entry });
      continue;
    }

    if (isChangeLine(entry)) {
      const removed: DisplaySide[] = [];
      const added: DisplaySide[] = [];
      while (index < block.lines.length) {
        const candidate = block.lines[index];
        if (candidate === undefined || typeof candidate !== "string" || !isChangeLine(candidate)) break;
        if (candidate.startsWith("-")) {
          removed.push(rawSide(oldLine, candidate.slice(1)));
          oldLine = nextLine(oldLine);
        } else {
          added.push(rawSide(newLine, candidate.slice(1)));
          newLine = nextLine(newLine);
        }
        index += 1;
      }
      index -= 1;
      for (let pair = 0; pair < Math.max(removed.length, added.length); pair += 1) {
        lines.push(displayRow(removed[pair], added[pair]));
      }
      continue;
    }

    if (entry.startsWith(" ")) {
      lines.push(displayRow(rawSide(oldLine, entry.slice(1)), rawSide(newLine, entry.slice(1))));
      oldLine = nextLine(oldLine);
      newLine = nextLine(newLine);
      continue;
    }

    lines.push({ kind: "meta", text: entry });
  }

  const leftLabel = block.left_label ?? parsedLeftLabel;
  const rightLabel = block.right_label ?? parsedRightLabel;
  return { ...(leftLabel ? { leftLabel } : {}), ...(rightLabel ? { rightLabel } : {}), lines };
}

export function renderDiffHtml(block: DiffBlock): string {
  const diff = normalizeDiff(block);
  const labels = diff.leftLabel || diff.rightLabel ? `<thead><tr><th colspan="2">${escape(diff.leftLabel ?? "Before")}</th><th colspan="2">${escape(diff.rightLabel ?? "After")}</th></tr></thead>` : "";
  const rows = diff.lines
    .map((line) => {
      if (line.kind === "meta") return `<tr class="doc-diff-meta"><td colspan="4"><code>${escape(line.text)}</code></td></tr>`;
      const state = diffState(line.left, line.right);
      return `<tr class="doc-diff-row doc-diff-${state}">${renderDiffCell(line.left, "line")}${renderDiffCell(line.left, "content")}${renderDiffCell(line.right, "line")}${renderDiffCell(line.right, "content")}</tr>`;
    })
    .join("");
  return `<div class="doc-diff" data-language="${escape(block.language ?? "text")}"><div class="doc-diff-scroll"><table class="doc-diff-table">${labels}<tbody>${rows}</tbody></table></div></div>`;
}

export function renderDiffMarkdown(block: DiffBlock): string {
  const source = applyMarkdownLabels(
    block,
    block.lines.flatMap((entry) => (typeof entry === "string" ? [entry] : serializeExplicitLine(entry))),
  );
  return fenced("diff", source.join("\n"));
}

function explicitRow(line: DiffLine): DisplayRow {
  return displayRow(line.left ? explicitSide(line.left) : undefined, line.right ? explicitSide(line.right) : undefined);
}

function explicitSide(side: DiffSide): DisplaySide {
  return { line: side.line, segments: side.segments ?? [{ text: side.text ?? "" }] };
}

function rawSide(line: number | undefined, text: string): DisplaySide {
  return line === undefined ? { segments: [{ text }] } : { line, segments: [{ text }] };
}

function displayRow(left: DisplaySide | undefined, right: DisplaySide | undefined): DisplayRow {
  return { kind: "row", ...(left ? { left } : {}), ...(right ? { right } : {}) };
}

function renderDiffCell(side: DisplaySide | undefined, role: "line" | "content"): string {
  if (role === "line") return `<td class="doc-diff-line">${side?.line ?? ""}</td>`;
  return `<td class="doc-diff-content"><code>${side ? side.segments.map(renderSegment).join("") : ""}</code></td>`;
}

function renderSegment(segment: DiffSegment): string {
  const className = segment.mark ? `doc-diff-inline-${segment.mark}` : "";
  return className ? `<mark class="${className}">${escape(segment.text)}</mark>` : escape(segment.text);
}

function serializeExplicitLine(line: DiffLine): string[] {
  const left = line.left ? sideText(line.left) : undefined;
  const right = line.right ? sideText(line.right) : undefined;
  if (left !== undefined && right !== undefined) return left === right ? [` ${left}`] : [`-${left}`, `+${right}`];
  if (left !== undefined) return [`-${left}`];
  return [`+${right ?? ""}`];
}

function sideText(side: DiffSide): string {
  return side.segments ? side.segments.map((segment) => segment.text).join("") : side.text ?? "";
}

function applyMarkdownLabels(block: DiffBlock, source: string[]): string[] {
  const leftIndex = source.findIndex((line) => line.startsWith("--- "));
  const rightIndex = source.findIndex((line) => line.startsWith("+++ "));
  if (block.left_label && leftIndex >= 0) source[leftIndex] = `--- ${block.left_label}`;
  if (block.right_label && rightIndex >= 0) source[rightIndex] = `+++ ${block.right_label}`;
  if (!block.left_label && !block.right_label) return source;

  const hasLeft = leftIndex >= 0;
  const hasRight = rightIndex >= 0;
  if (hasLeft && hasRight) return source;

  const left = block.left_label ?? (hasLeft ? undefined : "Before");
  const right = block.right_label ?? (hasRight ? undefined : "After");
  if (!hasLeft && hasRight) {
    source.splice(rightIndex, 0, ...(left ? [`--- ${left}`] : []));
    return source;
  }
  if (hasLeft && !hasRight) {
    source.splice(leftIndex + 1, 0, ...(right ? [`+++ ${right}`] : []));
    return source;
  }

  const headerIndex = source.findIndex((line) => line.startsWith("@@ ") || isChangeLine(line) || line.startsWith(" "));
  const insertionIndex = headerIndex >= 0 ? headerIndex : source.length;
  source.splice(insertionIndex, 0, ...(left ? [`--- ${left}`] : []), ...(right ? [`+++ ${right}`] : []));
  return source;
}

function parseHunk(value: string): { oldLine: number; newLine: number } | undefined {
  const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(value);
  return match ? { oldLine: Number(match[1]), newLine: Number(match[2]) } : undefined;
}

function diffLabel(value: string): string {
  return value.split("\t", 1)[0] ?? value;
}

function isChangeLine(value: string): boolean {
  return (value.startsWith("-") && !value.startsWith("--- ")) || (value.startsWith("+") && !value.startsWith("+++ "));
}

function nextLine(value: number | undefined): number | undefined {
  return value === undefined ? undefined : value + 1;
}

function diffState(left: DisplaySide | undefined, right: DisplaySide | undefined): "removed" | "added" | "context" | "changed" {
  if (left && !right) return "removed";
  if (!left && right) return "added";
  if (left && right && left.segments.map((segment) => segment.text).join("") === right.segments.map((segment) => segment.text).join("")) return "context";
  return "changed";
}

function fenced(language: string, body: string): string {
  const fence = body.includes("```") ? "````" : "```";
  return `${fence}${language}\n${body}\n${fence}`;
}
