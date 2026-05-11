export type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "caution";
export type Layout = "1col" | "2col" | "3col" | "sidebar";
export type Width = "normal" | "wide" | "full";
export type Align = "left" | "center" | "right";
export type Priority = "low" | "normal" | "high";

export interface DocIR {
  title: string;
  lang?: string;
  description?: string;
  blocks: Block[];
}

export interface BaseBlock {
  type: string;
  title?: string;
  layout?: Layout;
  width?: Width;
  align?: Align;
  tone?: Tone;
  priority?: Priority;
}

export interface IncludeBlock extends BaseBlock {
  type: "include";
  src: string;
}

export interface SectionBlock extends BaseBlock {
  type: "section";
  blocks: Block[];
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  items: string[];
  ordered?: boolean;
}

export interface NoticeBlock extends BaseBlock {
  type: "notice";
  text?: string;
  body?: string;
}

export interface DecisionBlock extends BaseBlock {
  type: "decision";
  decision: string;
  rationale?: string;
}

export interface RiskBlock extends BaseBlock {
  type: "risk";
  risk: string;
  impact?: string;
  mitigation?: string;
}

export interface CompareBlock extends BaseBlock {
  type: "compare";
  options?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
}

export interface CardsBlock extends BaseBlock {
  type: "cards";
  items: Array<{ title: string; text?: string; body?: string; href?: string; badge?: string }>;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | boolean | null> | unknown[]>;
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  language?: string;
  code: string;
}

export interface MermaidBlock extends BaseBlock {
  type: "mermaid";
  diagram: string;
}

export interface GenericBlock extends BaseBlock {
  type:
    | "summary"
    | "points"
    | "keyValue"
    | "constraint"
    | "assumption"
    | "openQuestion"
    | "command"
    | "output"
    | "todo"
    | "issue"
    | "checklist"
    | "quote"
    | "reference"
    | "fileTree";
  [key: string]: unknown;
}

export type Block =
  | IncludeBlock
  | SectionBlock
  | ParagraphBlock
  | ListBlock
  | NoticeBlock
  | DecisionBlock
  | RiskBlock
  | CompareBlock
  | CardsBlock
  | TableBlock
  | CodeBlock
  | MermaidBlock
  | GenericBlock;
