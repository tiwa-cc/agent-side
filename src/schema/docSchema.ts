import { z } from "zod";
import { blockSchema } from "./blockSchemas.js";

export const docSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    blocks: z.array(blockSchema).default([]),
  })
  .strict();
