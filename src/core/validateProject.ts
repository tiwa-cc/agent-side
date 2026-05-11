import { loadProject, type LoadProjectOptions } from "./loadProject.js";

export async function validateProject(options: LoadProjectOptions = {}): Promise<void> {
  await loadProject(options);
}
