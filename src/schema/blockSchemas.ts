import { z } from "zod";

const semanticHints = {
  title: z.string().optional(),
  layout: z.enum(["1col", "2col", "3col", "sidebar"]).optional(),
  width: z.enum(["normal", "wide", "full"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  tone: z.enum(["info", "success", "warning", "danger", "neutral", "caution"]).optional(),
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
      base.extend({ type: z.literal("summary"), body: z.string() }),
      base.extend({ type: z.literal("points"), items: z.array(z.string()) }),
      base.extend({ type: z.literal("list"), items: z.array(z.string()), ordered: z.boolean().optional() }),
      base.extend({ type: z.literal("notice"), text: z.string().optional(), body: z.string().optional() }),
      base.extend({ type: z.literal("decision"), decision: z.string(), rationale: z.string().optional() }),
      base.extend({ type: z.literal("risk"), risk: z.string(), impact: z.string().optional(), mitigation: z.string().optional() }),
      base.extend({ type: z.literal("compare"), options: z.array(z.record(z.any())).optional(), items: z.array(z.record(z.any())).optional() }),
      base.extend({
        type: z.literal("cards"),
        items: z.array(z.object({ title: z.string(), text: z.string().optional(), body: z.string().optional(), href: z.string().optional(), badge: z.string().optional() }).strict()),
      }),
      base.extend({
        type: z.literal("table"),
        columns: z.array(z.object({ key: z.string(), label: z.string() }).passthrough()).min(1),
        rows: z.array(z.union([z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])), z.array(z.unknown())])),
      }),
      base.extend({ type: z.literal("code"), language: z.string().optional(), code: z.string() }),
      base.extend({ type: z.literal("mermaid"), diagram: z.string() }),
      base.extend({ type: z.literal("keyValue"), items: z.array(z.object({ key: z.string(), value: z.string() }).strict()) }),
      base.extend({ type: z.literal("constraint"), items: z.array(z.string()) }),
      base.extend({ type: z.literal("assumption"), items: z.array(z.string()) }),
      base.extend({ type: z.literal("openQuestion"), question: z.string(), context: z.string().optional() }),
      base.extend({ type: z.literal("command"), shell: z.string().optional(), command: z.string() }),
      base.extend({ type: z.literal("output"), body: z.string() }),
      base.extend({ type: z.literal("todo"), items: z.array(z.object({ id: z.string().optional(), title: z.string(), status: z.string().optional(), priority: z.string().optional() }).passthrough()) }),
      base.extend({ type: z.literal("issue"), body: z.string() }),
      base.extend({ type: z.literal("checklist"), items: z.array(z.object({ label: z.string(), checked: z.boolean().optional() }).strict()) }),
      base.extend({ type: z.literal("quote"), body: z.string() }),
      base.extend({ type: z.literal("reference"), items: z.array(z.object({ label: z.string(), path: z.string() }).strict()) }),
      base.extend({ type: z.literal("fileTree"), root: z.string(), items: z.array(z.object({ path: z.string(), description: z.string().optional() }).strict()) }),
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
