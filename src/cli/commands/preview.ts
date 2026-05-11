import { createServer } from "node:http";
import { dirname } from "pathe";
import sirv from "sirv";
import { renderProject, type RenderProjectOptions } from "../../core/renderProject.js";

export async function previewCommand(entry?: string, options: { out?: string; config?: string; port?: string } = {}): Promise<void> {
  const renderOptions: RenderProjectOptions = {};
  if (options.config) renderOptions.configPath = options.config;
  if (entry) renderOptions.entry = entry;
  if (options.out) renderOptions.outDir = options.out;

  const result = await renderProject(renderOptions);
  const outDir = dirname(result.outFile);
  const port = Number(options.port ?? 4173);
  const serve = sirv(outDir, { dev: true, single: true });
  const server = createServer((request, response) => serve(request, response));

  await new Promise<void>((resolveServer) => {
    server.listen(port, "127.0.0.1", resolveServer);
  });

  console.log(`Preview server running at http://127.0.0.1:${port}`);
}
