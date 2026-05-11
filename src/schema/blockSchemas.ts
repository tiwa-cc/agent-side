import { z } from "zod";

const semanticHints = {
  title: z.string().optional(),
  layout: z.enum(["1col", "2col", "3col", "sidebar"]).optional(),
  width: z.enum(["normal", "wide", "full"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  tone: z.enum(["info", "success", "warning", "danger", "neutral"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
};

const forbiddenPresentationKeys = ["class", "style", "margin", "padding", "font-size", "color"];

const base = z.object(semanticHints).strict();

export const blockSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .discriminatedUnion("type", [
      base.extend({ type: z.literal("include"), src: z.string().min(1) }),
      base.extend({ type: z.literal("section"), blocks: z.array(blockSchema) }),
      base.extend({ type: z.literal("paragraph"), text: z.string() }),
      base.extend({ type: z.literal("list"), items: z.array(z.string()), ordered: z.boolean().optional() }),
      base.extend({ type: z.literal("notice"), text: z.string() }),
      base.extend({ type: z.literal("decision"), decision: z.string(), rationale: z.string().optional() }),
      base.extend({ type: z.literal("risk"), risk: z.string(), mitigation: z.string().optional() }),
      base.extend({ type: z.literal("compare"), options: z.array(z.record(z.string())) }),
      base.extend({
        type: z.literal("cards"),
        items: z.array(z.object({ title: z.string(), text: z.string().optional(), href: z.string().optional() }).strict()),
      }),
      base.extend({
        type: z.literal("table"),
        columns: z.array(z.object({ key: z.string(), label: z.string() }).strict()).min(1),
        rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
      }),
      base.extend({ type: z.literal("code"), language: z.string().optional(), code: z.string() }),
      base.extend({ type: z.literal("mermaid"), diagram: z.string() }),
    ])
    .superRefine((block, ctx) => {
      for (const key of forbiddenPresentationKeys) {
        if (key in block) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Presentation key "${key}" is not allowed` });
      }
      if (block.type === "table") {
        block.rows.forEach((row, index) => {
          if (Array.isArray(row)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rows", index], message: "Array-based table rows are forbidden" });
          }
        });
      }
    }),
);
