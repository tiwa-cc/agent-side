import { z } from "zod";

export const themeSchema = z
  .object({
    name: z.string(),
    renderer: z.enum(["plain", "bootstrap", "markdown"]).optional(),
    tokens: z
      .object({
        accent: z.string().optional(),
        surface: z.string().optional(),
        text: z.string().optional(),
      })
      .default({}),
    blocks: z
      .object({
        page: z.object({ container: z.enum(["sm", "md", "lg", "xl", "fluid"]).optional() }).passthrough().optional(),
        section: z.object({ spacing: z.enum(["compact", "normal", "loose"]).optional() }).passthrough().optional(),
        cards: z.object({ gap: z.enum(["compact", "normal", "loose"]).optional(), border: z.boolean().optional(), shadow: z.enum(["none", "sm", "md"]).optional(), radius: z.enum(["none", "sm", "md"]).optional() }).passthrough().optional(),
        notice: z.object({ style: z.enum(["solid", "soft"]).optional() }).passthrough().optional(),
      })
      .passthrough()
      .default({}),
  })
  .strict();

export type DocirTheme = z.infer<typeof themeSchema>;
