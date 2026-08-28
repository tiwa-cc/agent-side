import { z } from "zod";

export const inlineNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), text: z.string() }).strict(),
    z.object({ type: z.literal("strong"), children: z.array(inlineNodeSchema).min(1) }).strict(),
    z.object({ type: z.literal("em"), children: z.array(inlineNodeSchema).min(1) }).strict(),
    z.object({ type: z.literal("del"), children: z.array(inlineNodeSchema).min(1) }).strict(),
    z.object({ type: z.literal("inlineCode"), text: z.string() }).strict(),
    z.object({ type: z.literal("link"), href: z.string().min(1), title: z.string().optional(), children: z.array(inlineNodeSchema).min(1) }).strict(),
    z.object({ type: z.literal("break") }).strict(),
    z.object({ type: z.literal("image"), src: z.string().min(1), alt: z.string(), title: z.string().optional() }).strict(),
  ]),
);

export const richTextSchema = z.union([z.string(), z.array(inlineNodeSchema).min(1)]);

export const tableCellSchema = z.union([richTextSchema, z.number(), z.boolean(), z.null()]);
