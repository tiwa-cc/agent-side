import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import { loadConfig } from "../../config/loadConfig.js";
import { loadDoc } from "../../loader/loadDoc.js";
import { renderDocument } from "../../renderer/bootstrap/renderDocument.js";

export async function renderCommand(entry?: string, options: { out?: string; config?: string } = {}): Promise<void> {
  const config = await loadConfig(options.config);
  const doc = await loadDoc(entry ?? config.site.entry, config);
  const outDir = resolve(process.cwd(), options.out ?? config.site.out_dir);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "index.html"), renderDocument(doc, { config }), "utf8");
  console.log(`Rendered ${resolve(outDir, "index.html")}`);
}
