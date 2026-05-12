import { z } from "zod";

export const configSchema = z.object({
  site: z.object({
    title: z.string().default("agent-side"),
    lang: z.string().default("en"),
    entry: z.string().default("docs/index.yml"),
    out_dir: z.string().default("dist"),
  }),
  renderer: z
    .object({
      name: z.literal("bootstrap").default("bootstrap"),
      theme: z.string().default("default"),
      output: z
        .object({
          mode: z.enum(["single", "bundle", "site"]).default("single"),
        })
        .default({ mode: "single" }),
      mermaid: z
        .object({
          mode: z.enum(["cdn", "bundled", "pre_rendered"]).default("cdn"),
        })
        .default({ mode: "cdn" }),
    })
    .default({ name: "bootstrap", theme: "default", output: { mode: "single" }, mermaid: { mode: "cdn" } }),
  include: z
    .object({
      base_dir: z.string().default("docs"),
      allow_parent: z.boolean().default(false),
    })
    .default({ base_dir: "docs", allow_parent: false }),
  validation: z
    .object({
      strict: z.boolean().default(true),
      unknown_keys: z.enum(["error", "strip", "passthrough"]).default("error"),
    })
    .default({ strict: true, unknown_keys: "error" }),
  theme: z
    .object({
      path: z.string().default("themes/default.yml"),
    })
    .default({ path: "themes/default.yml" }),
});

export type DocirConfig = z.infer<typeof configSchema>;
