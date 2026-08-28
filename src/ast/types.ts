export type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "caution";
export type Layout = "1col" | "2col" | "3col" | "sidebar";
export type Width = "normal" | "wide" | "full";
export type Align = "left" | "center" | "right";
export type Priority = "low" | "normal" | "high";

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "del"; children: InlineNode[] }
  | { type: "inlineCode"; text: string }
  | { type: "link"; href: string; title?: string; children: InlineNode[] }
  | { type: "break" }
  | { type: "image"; src: string; alt: string; title?: string };

export type RichText = string | InlineNode[];

export type TableCell = RichText | number | boolean | null;

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
  text: RichText;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  items: RichText[];
  ordered?: boolean;
}

export interface NoticeBlock extends BaseBlock {
  type: "notice";
  text?: RichText;
  body?: RichText;
}

export interface DecisionBlock extends BaseBlock {
  type: "decision";
  decision: RichText;
  rationale?: RichText;
}

export interface RiskBlock extends BaseBlock {
  type: "risk";
  risk: RichText;
  impact?: RichText;
  mitigation?: RichText;
}

export interface CompareBlock extends BaseBlock {
  type: "compare";
  options?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
}

export interface CardsBlock extends BaseBlock {
  type: "cards";
  items: Array<{ title: string; text?: RichText; body?: RichText; href?: string; badge?: string }>;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, TableCell> | unknown[]>;
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
