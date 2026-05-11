import { z } from "zod";

export const themeSchema = z
  .object({
    name: z.string(),
    renderer: z.literal("bootstrap"),
    tokens: z
      .object({
        accent: z.string().optional(),
        surface: z.string().optional(),
        text: z.string().optional(),
      })
      .default({}),
  })
  .strict();
