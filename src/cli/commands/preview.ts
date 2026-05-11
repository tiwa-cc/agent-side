import { renderCommand } from "./render.js";

export async function previewCommand(entry?: string, options: { out?: string; config?: string } = {}): Promise<void> {
  await renderCommand(entry, options);
  console.log("Run `pnpm preview` to open the Vite preview shell.");
}
