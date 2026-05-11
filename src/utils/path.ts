import { resolve } from "pathe";

export function fromRoot(path: string): string {
  return resolve(process.cwd(), path);
}
