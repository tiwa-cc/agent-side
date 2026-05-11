import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "pathe";

export async function initCommand(options: { target?: string } = {}): Promise<void> {
  const target = resolve(process.cwd(), options.target ?? ".");
  const templateRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../../templates/default");
  await mkdir(target, { recursive: true });
  await cp(templateRoot, target, { recursive: true, force: false, errorOnExist: false });
  console.log(`Initialized agent-side project in ${target}`);
}
